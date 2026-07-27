import { describe, expect, it } from 'vitest'

import {
  RUN_TALENT_ICON_MODULE_DIRS,
  getRunTalentIconAssetPath,
  getRunTalentIconAssetUrl,
  normalizeRunTalentIconAssetName,
} from './runTalentIcons'
import { RUN_TALENT_NODE_BY_ID, RUN_TALENT_NODES, type RunTalentNode } from './talents'

const sourceRoot = '/Users/zackota/Desktop/roguelikeGameUI/未实装/战斗天赋图标'
const targetIconModules = import.meta.glob('/public/assets/run-talents/icons/**/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

const confirmedSourceRelativeFiles = [
  '兽王赦令/主兽绑定.png',
  '兽王赦令/光环扩散.png',
  '兽王赦令/协同撕咬.png',
  '兽王赦令/复苏律令.png',
  '兽王赦令/护主本能.png',
  '兽王赦令/指令突袭.png',
  '兽王赦令/百兽合围.png',
  '兽王赦令/首领化.png',
  '死契处刑/处刑线.png',
  '死契处刑/标记扩散.png',
  '死契处刑/死契标记.png',
  '死契处刑/死契连锁.png',
  '死契处刑/穿透魂火.png',
  '死契处刑/精英破契.png',
  '死契处刑/贯穿审判.png',
  '死契处刑/魂爆初醒.png',
  '蓝晶契约/冷却导流.png',
  '蓝晶契约/吸晶回响.png',
  '蓝晶契约/晶域连锁.png',
  '蓝晶契约/精英侵蚀.png',
  '蓝晶契约/脉冲共鸣.png',
  '蓝晶契约/蓝晶充能.png',
  '蓝晶契约/蓝晶过载.png',
  '蓝晶契约/领域延展.png',
  '血羽游侠/散射织网.png',
  '血羽游侠/暴击羽裂.png',
  '血羽游侠/流血箭族.png',
  '血羽游侠/精英放血.png',
  '血羽游侠/血羽印记.png',
  '血羽游侠/血羽连射.png',
  '血羽游侠/血羽风暴.png',
  '血羽游侠/血裂追击.png',
  '通用/冷却回声.png',
  '通用/危急闪避.png',
  '通用/契约定向.png',
  '通用/战利品预感.png',
  '通用/技能熟化.png',
  '通用/精英洞察.png',
  '通用/蓝晶引流.png',
  '通用/过载节奏.png',
] as const

const sourceFileNameFor = (node: Pick<RunTalentNode, 'name'>) => {
  const normalized = normalizeRunTalentIconAssetName(node.name)
  if (normalized === '精英缓蚀') return '精英侵蚀.png'
  return normalized === '流血箭簇' ? '流血箭族.png' : `${normalized}.png`
}

const targetFileNameFor = (node: Pick<RunTalentNode, 'name'>) => `${normalizeRunTalentIconAssetName(node.name)}.png`
const targetGlobKeyFor = (assetPath: string) => `/public/${assetPath}`

describe('run talent icon assets', () => {
  it('maps all run talents to project-local PNG icons copied from the confirmed source directory', () => {
    expect(RUN_TALENT_NODES).toHaveLength(40)
    expect(sourceRoot).toBe('/Users/zackota/Desktop/roguelikeGameUI/未实装/战斗天赋图标')
    expect(confirmedSourceRelativeFiles).toHaveLength(40)
    expect(Object.keys(targetIconModules)).toHaveLength(40)

    for (const node of RUN_TALENT_NODES) {
      const moduleDir = RUN_TALENT_ICON_MODULE_DIRS[node.module]
      const sourceRelativePath = `${moduleDir}/${sourceFileNameFor(node)}`
      const expectedAssetPath = `assets/run-talents/icons/${moduleDir}/${targetFileNameFor(node)}`
      const assetUrl = getRunTalentIconAssetUrl(node)

      expect(confirmedSourceRelativeFiles, `${node.id} source ${sourceRelativePath}`).toContain(sourceRelativePath)
      expect(targetIconModules, `${node.id} target ${expectedAssetPath}`).toHaveProperty(targetGlobKeyFor(expectedAssetPath))
      expect(getRunTalentIconAssetPath(node)).toBe(expectedAssetPath)
      expect(assetUrl).toContain('/assets/run-talents/icons/')
      expect(assetUrl).not.toContain('/Users/')
      expect(assetUrl).not.toContain('Desktop')
      expect(assetUrl).not.toContain('roguelikeGameUI')
      expect(assetUrl).not.toContain('未实装')
    }
  })

  it('uses the corrected project filename for 流血箭簇 without a runtime typo alias', () => {
    const node = RUN_TALENT_NODE_BY_ID.get('run_blood_02')

    expect(node?.name).toBe('流血箭簇')
    expect(normalizeRunTalentIconAssetName(node?.name ?? '')).toBe('流血箭簇')
    expect(confirmedSourceRelativeFiles).toContain('血羽游侠/流血箭族.png')
    expect(targetIconModules).toHaveProperty('/public/assets/run-talents/icons/血羽游侠/流血箭簇.png')
    expect(targetIconModules).not.toHaveProperty('/public/assets/run-talents/icons/血羽游侠/流血箭族.png')
    expect(getRunTalentIconAssetPath(node!)).toBe('assets/run-talents/icons/血羽游侠/流血箭簇.png')
    expect(getRunTalentIconAssetUrl(node!)).toContain(encodeURIComponent('流血箭簇.png'))
    expect(getRunTalentIconAssetUrl(node!)).not.toContain(encodeURIComponent('流血箭族.png'))
  })

  it('uses the node name for 精英缓蚀 even though the restored source file is named 精英侵蚀', () => {
    const node = RUN_TALENT_NODE_BY_ID.get('run_crystal_07')

    expect(node?.name).toBe('精英缓蚀')
    expect(confirmedSourceRelativeFiles).toContain('蓝晶契约/精英侵蚀.png')
    expect(targetIconModules).toHaveProperty('/public/assets/run-talents/icons/蓝晶契约/精英缓蚀.png')
    expect(targetIconModules).not.toHaveProperty('/public/assets/run-talents/icons/蓝晶契约/精英侵蚀.png')
    expect(getRunTalentIconAssetPath(node!)).toBe('assets/run-talents/icons/蓝晶契约/精英缓蚀.png')
    expect(getRunTalentIconAssetUrl(node!)).toContain(encodeURIComponent('精英缓蚀.png'))
    expect(getRunTalentIconAssetUrl(node!)).not.toContain(encodeURIComponent('精英侵蚀.png'))
  })

  it('strips Lv5 prefixes when resolving breakthrough icon filenames', () => {
    const node = RUN_TALENT_NODE_BY_ID.get('run_death_05')

    expect(node?.name).toBe('Lv5 魂爆初醒')
    expect(normalizeRunTalentIconAssetName(node?.name ?? '')).toBe('魂爆初醒')
    expect(getRunTalentIconAssetPath(node!)).toBe('assets/run-talents/icons/死契处刑/魂爆初醒.png')
  })
})
