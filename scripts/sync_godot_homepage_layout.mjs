import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const scenePath = path.join(projectRoot, 'godot_homepage/scenes/main_menu.tscn')
const outputDir = path.join(projectRoot, 'public/assets/godot-ui')
const outputPath = path.join(outputDir, 'main-menu-layout.json')
const canvas = { width: 960, height: 640 }

const buttonMap = {
  StartButton: { id: 'start', modal: 'campaign', zIndex: 20 },
  CharacterButton: { id: 'character', modal: 'character', zIndex: 20 },
  InventoryButton: { id: 'inventory', modal: 'inventory', zIndex: 20 },
  SettingsButton: { id: 'settings', modal: 'settings', zIndex: 20 },
  BlacksmithButton: { id: 'blacksmith', modal: 'shop', zIndex: 10 },
  HunterHomeButton: { id: 'hunter-home', modal: 'hunter-home', zIndex: 10 },
  PortalButton: { id: 'portal', modal: 'campaign', zIndex: 10 },
  NoticeBoardButton: { id: 'notice-board', modal: 'guide', zIndex: 10 },
}

const parseAttributes = (raw) => {
  const attributes = {}
  const matcher = /([a-zA-Z_]+)=("[^"]*"|[^"\s]+)/g
  let match
  while ((match = matcher.exec(raw))) {
    const [, key, value] = match
    attributes[key] = value.startsWith('"') && value.endsWith('"')
      ? value.slice(1, -1)
      : value
  }
  return attributes
}

const parseScene = (source) => {
  const extResources = new Map()
  const nodes = new Map()
  let current

  source.split(/\r?\n/).forEach((line) => {
    const extResourceMatch = /^\[ext_resource\s+(.+)\]$/.exec(line)
    if (extResourceMatch) {
      const attributes = parseAttributes(extResourceMatch[1])
      if (attributes.id) {
        extResources.set(attributes.id, attributes)
      }
      current = undefined
      return
    }

    const nodeMatch = /^\[node name="([^"]+)" type="([^"]+)"(?: parent="([^"]+)")?\]/.exec(line)
    if (nodeMatch) {
      const [, name, type, parent = ''] = nodeMatch
      current = {
        name,
        type,
        parent,
        key: parent ? `${parent}/${name}` : name,
        props: {},
      }
      nodes.set(current.key, current)
      return
    }

    if (!current) return
    const propMatch = /^([a-zA-Z_]+) = (.+)$/.exec(line)
    if (!propMatch) return
    const [, key, rawValue] = propMatch
    current.props[key] = rawValue
  })

  return { nodes, extResources }
}

const numberProp = (node, key, fallback = 0) => {
  const value = node?.props[key]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const anchorProp = (node, key) => numberProp(node, key, 0)

const textProp = (node, key, fallback = '') => {
  const value = node?.props[key]
  if (!value) return fallback
  const quoted = /^"(.*)"$/.exec(value)
  return quoted ? quoted[1] : value
}

const boolProp = (node, key, fallback = false) => {
  const value = node?.props[key]
  if (!value) return fallback
  return value === 'true'
}

const extResourceIdProp = (node, key) => {
  const value = node?.props[key]
  if (!value) return undefined
  const matched = /^ExtResource\("([^"]+)"\)$/.exec(value)
  return matched?.[1]
}

const parentKeyFor = (node) => node.parent

const isCanvasBackedParent = (node) => (
  !node || node.type === 'Node2D' || node.type === 'CanvasLayer'
)

const rectFor = (nodes, node) => {
  const parent = nodes.get(parentKeyFor(node))
  const parentRect = isCanvasBackedParent(parent)
    ? { left: 0, top: 0, right: canvas.width, bottom: canvas.height }
    : rectFor(nodes, parent)
  const parentWidth = parentRect.right - parentRect.left
  const parentHeight = parentRect.bottom - parentRect.top
  const left = parentRect.left + parentWidth * anchorProp(node, 'anchor_left') + numberProp(node, 'offset_left')
  const top = parentRect.top + parentHeight * anchorProp(node, 'anchor_top') + numberProp(node, 'offset_top')
  const right = parentRect.left + parentWidth * anchorProp(node, 'anchor_right') + numberProp(node, 'offset_right')
  const bottom = parentRect.top + parentHeight * anchorProp(node, 'anchor_bottom') + numberProp(node, 'offset_bottom')
  return { left, top, right, bottom }
}

const pct = (value, total) => Number(((value / total) * 100).toFixed(3))

const resolveGodotResourcePath = (resourcePath) => {
  if (!resourcePath?.startsWith('res://')) return undefined
  return path.join(projectRoot, 'godot_homepage', resourcePath.slice('res://'.length))
}

const copyGodotAssetToPublic = async (resourcePath) => {
  const sourcePath = resolveGodotResourcePath(resourcePath)
  if (!sourcePath) return undefined
  await stat(sourcePath)
  await mkdir(outputDir, { recursive: true })
  const webSourcePath = path.extname(sourcePath).toLowerCase() === '.ogv'
    ? sourcePath.replace(/\.ogv$/i, '.webm')
    : sourcePath
  const publicSourcePath = await stat(webSourcePath).then(() => webSourcePath, () => sourcePath)
  const fileName = path.basename(publicSourcePath)
  const targetPath = path.join(outputDir, fileName)
  await copyFile(publicSourcePath, targetPath)
  return {
    source: path.relative(projectRoot, sourcePath),
    ...(publicSourcePath !== sourcePath ? { webSource: path.relative(projectRoot, publicSourcePath) } : {}),
    url: `assets/godot-ui/${fileName}`,
  }
}

const copyNodeResourceToPublic = async (extResources, node, propertyName) => {
  const resourceId = extResourceIdProp(node, propertyName)
  if (!resourceId) return undefined
  const resource = extResources.get(resourceId)
  if (!resource?.path) return undefined
  return copyGodotAssetToPublic(resource.path)
}

const source = await readFile(scenePath, 'utf8')
const { nodes, extResources } = parseScene(source)
const clickAreas = []

for (const node of nodes.values()) {
  const mapped = buttonMap[node.name]
  if (!mapped || node.type !== 'Button') continue
  const rect = rectFor(nodes, node)
  clickAreas.push({
    id: mapped.id,
    node: node.name,
    label: textProp(node, 'text', mapped.id),
    modal: mapped.modal,
    zIndex: mapped.zIndex,
    rect: {
      leftPct: pct(rect.left, canvas.width),
      topPct: pct(rect.top, canvas.height),
      widthPct: pct(rect.right - rect.left, canvas.width),
      heightPct: pct(rect.bottom - rect.top, canvas.height),
    },
  })
}

clickAreas.sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))

const backgroundVideoNode = [...nodes.values()].find((node) => node.name === 'BackgroundVideo' && node.type === 'VideoStreamPlayer')
const backgroundPosterNode = [...nodes.values()].find((node) => node.name === 'BackgroundPoster' && node.type === 'TextureRect')
const backgroundVideoAsset = await copyNodeResourceToPublic(extResources, backgroundVideoNode, 'stream')
const backgroundPosterAsset = await copyNodeResourceToPublic(extResources, backgroundPosterNode, 'texture')
const backgroundMedia = backgroundVideoAsset || backgroundPosterAsset
  ? {
      video: backgroundVideoAsset
        ? {
            ...backgroundVideoAsset,
            node: backgroundVideoNode.name,
            autoplay: boolProp(backgroundVideoNode, 'autoplay', true),
            loop: boolProp(backgroundVideoNode, 'loop', true),
            expand: boolProp(backgroundVideoNode, 'expand', true),
          }
        : undefined,
      poster: backgroundPosterAsset
        ? {
            ...backgroundPosterAsset,
            node: backgroundPosterNode.name,
          }
        : undefined,
    }
  : undefined

const layout = {
  schemaVersion: 1,
  source: 'godot_homepage/scenes/main_menu.tscn',
  generatedAt: new Date().toISOString(),
  canvas,
  ...(backgroundMedia ? { backgroundMedia } : {}),
  clickAreas,
}

await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, `${JSON.stringify(layout, null, 2)}\n`)
console.log(`Wrote ${path.relative(projectRoot, outputPath)} with ${clickAreas.length} click areas${backgroundMedia ? ' and background media' : ''}.`)
