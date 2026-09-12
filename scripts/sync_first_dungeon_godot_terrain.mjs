import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceDir = path.join(projectRoot, 'godot_first_dungeon_terrain/exports/terrain-v1')
const outputDir = path.join(projectRoot, 'public/assets/terrain/campaign-1/godot-terrain-v1')

const files = [
  ['terrain-atlas-16px.png', '4727d99b98b4708cce47cc2660559853b706f915615fc534cc5240eb5c8d945b'],
  ['terrain-rules.json', 'a4f013e6bc3c73e1e403607d3752a452590d6a6dd6dc4bc14ca9df017a0392fe'],
  ['terrain-fixtures-v1.json', 'f6ad8d029fc5545d85c1c4042237fe6d1b6f3b02e79aa69e8707b11caea48213'],
  ['terrain-manifest.json', '20480ea0f023e53a96ed3871aefda664575eb991d3ef311f4cf61c76f5086018'],
]

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

const readVerified = async (fileName, expectedHash) => {
  const bytes = await readFile(path.join(sourceDir, fileName))
  const actualHash = sha256(bytes)
  if (actualHash !== expectedHash) {
    throw new Error(`Frozen terrain export hash mismatch for ${fileName}: ${actualHash}`)
  }
  return bytes
}

const validateContract = (rules, fixtures, manifest) => {
  if (
    rules.schemaVersion !== 'first-dungeon-terrain-rules-v2'
    || rules.cellSize !== 16
    || rules.chunkCells !== 32
    || rules.chunkPixels !== 512
    || rules.occupancy?.algorithmId !== 'first-dungeon-u32-mix-v1'
    || rules.chunkEvaluation?.haloCells !== 1
    || rules.bitValues?.north !== 1
    || rules.bitValues?.east !== 2
    || rules.bitValues?.south !== 4
    || rules.bitValues?.west !== 8
    || !Array.isArray(rules.maskToAtlasTile)
    || rules.maskToAtlasTile.length !== 16
  ) {
    throw new Error('Frozen terrain rules no longer match the E24 web contract')
  }

  if (
    fixtures.schemaVersion !== 'first-dungeon-terrain-fixtures-v1'
    || fixtures.battlefieldSeed !== 305419896
    || fixtures.chunkCells !== 32
    || fixtures.chunks?.length !== 3
    || fixtures.sharedEdges?.length !== 2
    || fixtures.recomputation?.differentSeedChangedCellCount !== 491
  ) {
    throw new Error('Frozen terrain fixtures no longer match the E24 evidence contract')
  }

  if (
    manifest.schemaVersion !== 'first-dungeon-terrain-export-v1'
    || manifest.campaign !== 1
    || manifest.exports?.atlas?.sha256 !== files[0][1]
    || manifest.exports?.rules?.sha256 !== files[1][1]
    || manifest.exports?.fixtures?.sha256 !== files[2][1]
    || manifest.runtimeBoundary?.presentationOnly !== true
    || !Array.isArray(manifest.runtimeBoundary?.webConsumes)
    || manifest.runtimeBoundary.webConsumes.join('|') !== 'exported static PNG|terrain-rules.json|terrain-manifest.json'
  ) {
    throw new Error('Frozen terrain manifest no longer matches the E24 web boundary')
  }
}

const bytesByFile = new Map(await Promise.all(files.map(async ([fileName, expectedHash]) => (
  [fileName, await readVerified(fileName, expectedHash)]
))))
const rules = JSON.parse(bytesByFile.get('terrain-rules.json').toString('utf8'))
const fixtures = JSON.parse(bytesByFile.get('terrain-fixtures-v1.json').toString('utf8'))
const manifest = JSON.parse(bytesByFile.get('terrain-manifest.json').toString('utf8'))
validateContract(rules, fixtures, manifest)

await mkdir(outputDir, { recursive: true })
for (const [fileName, expectedHash] of files) {
  const sourcePath = path.join(sourceDir, fileName)
  const targetPath = path.join(outputDir, fileName)
  await copyFile(sourcePath, targetPath)
  const copiedHash = sha256(await readFile(targetPath))
  if (copiedHash !== expectedHash) {
    throw new Error(`Copied terrain export hash mismatch for ${fileName}: ${copiedHash}`)
  }
}

console.log(`Synced ${files.length} verified E24 terrain exports to ${path.relative(projectRoot, outputDir)}.`)
