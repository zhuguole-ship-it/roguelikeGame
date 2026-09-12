import { describe, expect, it } from 'vitest'

import { getMetaTalentIconAssetPath, getMetaTalentIconPresentation } from './metaTalentIcons'
import { META_TALENT_NODES } from './talents'

describe('metaTalentIcons', () => {
  it('uses exact packaged assets where available and programmatic group/tier emblems for every missing V3 icon', () => {
    const presentations = META_TALENT_NODES.map((node) => ({
      node,
      icon: getMetaTalentIconPresentation(node),
    }))
    const assetIcons = presentations.filter(({ icon }) => icon.kind === 'asset')
    const programmaticIcons = presentations.filter(({ icon }) => icon.kind === 'programmatic')

    expect(META_TALENT_NODES).toHaveLength(84)
    expect(assetIcons).toHaveLength(17)
    expect(programmaticIcons).toHaveLength(67)
    expect(assetIcons.every(({ icon }) => icon.kind === 'asset' && icon.assetPath.startsWith('assets/meta-talents/icons/'))).toBe(true)
    expect(programmaticIcons.every(({ icon }) => (
      icon.kind === 'programmatic'
      && icon.groupLabel.length > 0
      && icon.glyph.length > 0
      && ['BRANCH', 'DEEP', 'KEY'].includes(icon.tier)
    ))).toBe(true)
    expect(getMetaTalentIconAssetPath({ name: '契约视界' })).toContain('2死契处刑/进阶树/契约视界.png')
    expect(getMetaTalentIconAssetPath({ name: '困难 Boss 追忆' })).toContain('6四难度精通树/困难难度/困难BOSS追忆.png')
    expect(getMetaTalentIconAssetPath({ name: '地狱橙装追踪' })).toContain('6四难度精通树/地狱难度/地狱套装追踪.png')

    expect(getMetaTalentIconPresentation(META_TALENT_NODES.find((node) => node.id === 'meta_common_01')!)).toMatchObject({
      kind: 'asset',
    })
    expect(getMetaTalentIconPresentation(META_TALENT_NODES.find((node) => node.id === 'meta_death_base_01')!)).toEqual({
      kind: 'programmatic', group: 'death', groupLabel: '死契', glyph: '刃', tier: 'BRANCH',
    })
    expect(getMetaTalentIconPresentation(META_TALENT_NODES.find((node) => node.id === 'meta_blood_advanced_01')!)).toEqual({
      kind: 'programmatic', group: 'blood', groupLabel: '血羽', glyph: '羽', tier: 'DEEP',
    })
    expect(getMetaTalentIconPresentation(META_TALENT_NODES.find((node) => node.id === 'meta_endgame_01')!)).toEqual({
      kind: 'programmatic', group: 'endgame', groupLabel: '终局', glyph: '冠', tier: 'KEY',
    })
  })
})
