import type { RunTalentNode } from './talents'

export const RUN_TALENT_ICON_BASE_PATH = 'assets/run-talents/icons'

export const RUN_TALENT_ICON_MODULE_DIRS: Record<RunTalentNode['module'], string> = {
  common: '通用',
  death: '死契处刑',
  blood: '血羽游侠',
  beast: '兽王赦令',
  crystal: '蓝晶契约',
}

export const normalizeRunTalentIconAssetName = (name: string) => name.replace(/^Lv5\s+/, '').trim()

export const getRunTalentIconAssetPath = (node: Pick<RunTalentNode, 'module' | 'name'>) => {
  return `${RUN_TALENT_ICON_BASE_PATH}/${RUN_TALENT_ICON_MODULE_DIRS[node.module]}/${normalizeRunTalentIconAssetName(node.name)}.png`
}

export const getRunTalentIconAssetUrl = (node: Pick<RunTalentNode, 'module' | 'name'>) => {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const encodedPath = getRunTalentIconAssetPath(node).split('/').map(encodeURIComponent).join('/')
  return `${baseUrl}${encodedPath}`
}
