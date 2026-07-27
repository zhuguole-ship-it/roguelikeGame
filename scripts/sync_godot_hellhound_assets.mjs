import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const entityId = 'dungeon-hellhound'
const sourceRoot = path.join(projectRoot, 'godot_asset_tools/assets/developer-assets', entityId)
const targetRoot = path.join(projectRoot, 'public/assets/developer-assets', entityId)
const configPath = path.join(projectRoot, 'public/assets/developer-assets/runtime-asset-overrides.json')

const actionDefaults = {
  idle: { combatAction: 'idle', fps: 8, durationSeconds: 0.75, loop: true, hitFrameIndex: 2, flipX: true },
  move: { combatAction: 'move', fps: 8, durationSeconds: 0.75, loop: true, hitFrameIndex: 2, flipX: false },
  attack: { combatAction: 'attack', fps: 8, loop: false, hitFrameIndex: 2, flipX: true },
  skill_1: { combatAction: 'skill', fps: 7, durationSeconds: 0.86, loop: false, flipX: true },
  hit: { combatAction: 'hit', fps: 6, durationSeconds: 1, loop: false, flipX: false },
  death: { combatAction: 'death', fps: 5, durationSeconds: 1.2, loop: false, flipX: true },
}

const defaultAnchors = {
  body: { x: 0.5, y: 0.68, label: '身体' },
  mouth: { x: 0.82, y: 0.32, label: '口部' },
  cast: { x: 0.73, y: 0.4, label: '吐息' },
  projectileSpawn: { x: 0.83, y: 0.33, label: '火焰' },
}

const pngSize = async (filePath) => {
  const buffer = await readFile(filePath)
  if (buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`${filePath} is not a PNG file`)
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

const listFrames = async (slot) => {
  const sourceDir = path.join(sourceRoot, slot)
  const files = await readdir(sourceDir)
  return files
    .filter((file) => /^frame_\d+\.png$/i.test(file))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
}

const readConfig = async () => {
  try {
    return JSON.parse(await readFile(configPath, 'utf8'))
  } catch {
    return { version: 1, generatedAt: new Date().toISOString(), entities: [] }
  }
}

const bySlot = (actions) => new Map(actions.map((action) => [action.slot, action]))

const syncedActions = []
const config = await readConfig()
const entity = config.entities.find((item) => item.entityId === entityId) ?? { entityId, actions: [] }
if (!config.entities.includes(entity)) {
  config.entities.unshift(entity)
}

const existingActions = bySlot(entity.actions ?? [])
for (const [slot, defaults] of Object.entries(actionDefaults)) {
  const files = await listFrames(slot)
  if (files.length === 0) {
    continue
  }

  const targetDir = path.join(targetRoot, slot)
  await mkdir(targetDir, { recursive: true })
  await Promise.all(files.map((file) => (
    copyFile(path.join(sourceRoot, slot, file), path.join(targetDir, file))
  )))

  const firstSize = await pngSize(path.join(sourceRoot, slot, files[0]))
  const frameUrls = files.map((file) => `assets/developer-assets/${entityId}/${slot}/${file}`)
  const previous = existingActions.get(slot) ?? {}
  existingActions.set(slot, {
    ...previous,
    entityId,
    slot,
    combatAction: previous.combatAction ?? defaults.combatAction,
    frameUrls,
    frameWidth: firstSize.width,
    frameHeight: firstSize.height,
    frameCount: files.length,
    fps: previous.fps ?? defaults.fps,
    durationSeconds: previous.durationSeconds ?? defaults.durationSeconds,
    loop: previous.loop ?? defaults.loop,
    hitFrameIndex: previous.hitFrameIndex ?? defaults.hitFrameIndex,
    flipX: previous.flipX ?? defaults.flipX,
    guideFrame: frameUrls[0],
    assetPath: frameUrls.join(' / '),
    anchors: previous.anchors ?? defaultAnchors,
    combatScale: previous.combatScale ?? 1,
    assetRevision: previous.assetRevision ?? new Date().toISOString(),
  })
  syncedActions.push(`${slot}:${files.length}`)
}

entity.actions = Array.from(existingActions.values())
config.generatedAt = new Date().toISOString()
await mkdir(path.dirname(configPath), { recursive: true })
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)

console.log(`Synced ${entityId}: ${syncedActions.join(', ')}`)
