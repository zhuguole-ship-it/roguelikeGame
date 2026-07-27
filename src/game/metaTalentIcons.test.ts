import { describe, expect, it } from 'vitest'

import { getMetaTalentIconAssetPath } from './metaTalentIcons'
import { META_TALENT_NODES } from './talents'

describe('metaTalentIcons', () => {
  it('maps every meta talent node to a packaged icon asset', () => {
    const missingMappings = META_TALENT_NODES
      .map((node) => ({ id: node.id, name: node.name, path: getMetaTalentIconAssetPath(node) }))
      .filter((entry) => !entry.path)

    expect(META_TALENT_NODES).toHaveLength(84)
    expect(missingMappings).toEqual([])
    expect(META_TALENT_NODES.every((node) => getMetaTalentIconAssetPath(node)?.startsWith('assets/meta-talents/icons/'))).toBe(true)
    expect(getMetaTalentIconAssetPath({ name: '契约视界' })).toContain('2死契处刑/进阶树/契约视界.png')
    expect(getMetaTalentIconAssetPath({ name: '困难 Boss 追忆' })).toContain('6四难度精通树/困难难度/困难BOSS追忆.png')
    expect(getMetaTalentIconAssetPath({ name: '地狱橙装追踪' })).toContain('6四难度精通树/地狱难度/地狱套装追踪.png')
  })
})
