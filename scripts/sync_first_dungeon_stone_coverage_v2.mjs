import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceRoot = path.join(projectRoot, 'godot_first_dungeon_terrain')
const exportDir = path.join(sourceRoot, 'exports/stone-coverage-v2')
const outputDir = path.join(projectRoot, 'public/assets/terrain/campaign-1/stone-coverage-v2')
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

const readVerified = async (filePath, expectedHash) => {
  const bytes = await readFile(filePath)
  const actualHash = sha256(bytes)
  if (actualHash !== expectedHash) throw new Error(`Frozen stone coverage hash mismatch for ${path.basename(filePath)}: ${actualHash}`)
  return bytes
}

const manifestPath = path.join(exportDir, 'stone-coverage-manifest-v2.json')
const rulesPath = path.join(exportDir, 'stone-coverage-rules-v2.json')
const manifestBytes = await readFile(manifestPath)
const manifest = JSON.parse(manifestBytes)
const rulesBytes = await readVerified(rulesPath, manifest.rules.sha256)
const rules = JSON.parse(rulesBytes)

if (
  manifest.schemaVersion !== 'first-dungeon-stone-coverage-manifest-v2'
  || manifest.runtimeEligible !== false
  || !Array.isArray(manifest.masks) || manifest.masks.length !== 16
  || rules.schemaVersion !== 'first-dungeon-stone-coverage-rules-v2'
  || rules.composition?.mossSideEdge?.rgb !== '#293A2E'
  || rules.composition?.mossSideEdge?.sourcePixels !== 2
  || rules.coverageTopology?.cellSizeWorldPixels !== 16
) throw new Error('Frozen E26 stone coverage contract no longer matches the web integration boundary')

const files = [
  [path.join(sourceRoot, manifest.sources.find((source) => source.role === 'moss').path), 'moss-512.jpg', manifest.sources.find((source) => source.role === 'moss').sha256],
  [path.join(sourceRoot, manifest.sources.find((source) => source.role === 'stone').path), 'stone-brick-512.jpg', manifest.sources.find((source) => source.role === 'stone').sha256],
  [path.join(exportDir, 'stone-coverage-mask-atlas-64.png'), 'stone-coverage-mask-atlas-64.png', manifest.atlas.sha256],
  [rulesPath, 'stone-coverage-rules-v2.json', manifest.rules.sha256],
  [manifestPath, 'stone-coverage-manifest-v2.json', sha256(manifestBytes)],
  ...manifest.masks.map((mask) => [path.join(sourceRoot, mask.path), `stone-coverage-mask-${String(mask.mask).padStart(2, '0')}.png`, mask.sha256]),
]

await mkdir(outputDir, { recursive: true })
for (const [sourcePath, targetName, expectedHash] of files) {
  await readVerified(sourcePath, expectedHash)
  const targetPath = path.join(outputDir, targetName)
  await copyFile(sourcePath, targetPath)
  await readVerified(targetPath, expectedHash)
}

console.log(`Synced ${files.length} verified E26 stone coverage assets to ${path.relative(projectRoot, outputDir)}.`)
