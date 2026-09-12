import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const outputRoot = resolve(projectRoot, 'exports/terrain-v1')
const rules = JSON.parse(readFileSync(resolve(outputRoot, 'terrain-rules.json'), 'utf8'))
const fixtures = JSON.parse(readFileSync(resolve(outputRoot, 'terrain-fixtures-v1.json'), 'utf8'))

const fail = (message) => {
  throw new Error(`E24 terrain contract verification failed: ${message}`)
}

const constants = rules.occupancy?.constants
if (rules.occupancy?.algorithmId !== 'first-dungeon-u32-mix-v1' || rules.occupancy?.bitWidth !== 32) {
  fail('missing portable unsigned-32 occupancy contract')
}

const u32 = (value) => value >>> 0
const imul32 = (left, right) => Math.imul(left, right) >>> 0
const hashU32 = (seed, globalCellX, globalCellY) => {
  let hash = u32(u32(seed) ^ constants.seedXor ^ imul32(globalCellX, constants.xMultiplier) ^ imul32(globalCellY, constants.yMultiplier))
  hash = imul32(u32(hash ^ (hash >>> 16)), constants.mixOneMultiplier)
  hash = imul32(u32(hash ^ (hash >>> 15)), constants.mixTwoMultiplier)
  return u32(hash ^ (hash >>> 16))
}
const isStone = (seed, x, y) => (hashU32(seed, x, y) & 0xff) < constants.stoneThresholdExclusive
const maskFor = (seed, x, y) => {
  if (!isStone(seed, x, y)) return 0
  return (isStone(seed, x, y - 1) ? 1 : 0)
    | (isStone(seed, x + 1, y) ? 2 : 0)
    | (isStone(seed, x, y + 1) ? 4 : 0)
    | (isStone(seed, x - 1, y) ? 8 : 0)
}

if (fixtures.chunks?.length !== 3 || fixtures.battlefieldSeed !== 305419896) {
  fail('fixture seed or three required chunks is missing')
}

for (const chunk of fixtures.chunks) {
  if (chunk.occupancyRows?.length !== 32 || chunk.maskRowsHex?.length !== 32) fail(`${chunk.id} rows are incomplete`)
  for (let y = 0; y < 32; y += 1) {
    if (chunk.occupancyRows[y].length !== 32 || chunk.maskRowsHex[y].length !== 32) fail(`${chunk.id} row ${y} is not 32 cells`)
    for (let x = 0; x < 32; x += 1) {
      const worldX = chunk.globalOriginCell.x + x
      const worldY = chunk.globalOriginCell.y + y
      if (chunk.occupancyRows[y][x] !== (isStone(fixtures.battlefieldSeed, worldX, worldY) ? '1' : '0')) fail(`${chunk.id} occupancy diverges at ${worldX},${worldY}`)
      if (Number.parseInt(chunk.maskRowsHex[y][x], 16) !== maskFor(fixtures.battlefieldSeed, worldX, worldY)) fail(`${chunk.id} mask diverges at ${worldX},${worldY}`)
    }
  }
}

for (const edge of fixtures.sharedEdges ?? []) {
  if (edge.pairCount !== 32 || edge.bidirectionalNeighborConsistency !== true || edge.pairs?.length !== 32) fail(`${edge.orientation} edge fixture is incomplete`)
  for (const pair of edge.pairs) {
    const expectedConnection = pair.firstCell.stone && pair.secondCell.stone
    if (!pair.consistent || pair.firstCell.neighborBit !== expectedConnection || pair.secondCell.neighborBit !== expectedConnection) fail(`${edge.orientation} edge mismatch at pair ${pair.index}`)
  }
}

if (fixtures.recomputation?.sameSeedStable !== true || fixtures.recomputation?.differentSeedChangedCellCount <= 0) {
  fail('fixture does not prove same-seed stability and changed-seed variance')
}

console.log(`E24 portable terrain contract passed: ${fixtures.chunks.length} chunks, ${fixtures.sharedEdges.length} shared edges, ${fixtures.recomputation.differentSeedChangedCellCount} changed cells for comparison seed.`)
