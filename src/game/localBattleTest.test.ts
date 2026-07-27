import { describe, expect, it } from 'vitest'

import type { LocalBattleTestSpawnOption } from './types'
import {
  LOCAL_BATTLE_MONSTER_COUNT_MAX,
  createLocalBattleMonsterSelection,
  getLocalBattleEntityGroups,
  getLocalBattleEntityOptions,
  validateLocalBattleMonsterSelection,
} from './localBattleTest'

const option = (
  entityId: string,
  group: LocalBattleTestSpawnOption['group'],
  overrides: Partial<LocalBattleTestSpawnOption> = {},
): LocalBattleTestSpawnOption => ({
  entityId,
  name: entityId,
  group,
  enabled: true,
  maxCount: 20,
  ...overrides,
})

describe('local battle test configuration', () => {
  it('uses only A spawn options and groups ordinary, elite and Boss entities', () => {
    const groups = getLocalBattleEntityGroups([
      option('ordinary-a', 'ordinary'),
      option('elite-a', 'elite'),
      option('boss-a', 'boss'),
      option('ordinary-a', 'ordinary', { name: '重复实体' }),
    ])

    expect(groups.map((group) => group.category)).toEqual(['ordinary', 'elite', 'boss'])
    expect(groups.map((group) => group.options.map((item) => item.id))).toEqual([
      ['ordinary-a'],
      ['elite-a'],
      ['boss-a'],
    ])
  })

  it('keeps asset-disabled entities unavailable with the supplied reason', () => {
    const [item] = getLocalBattleEntityOptions([
      option('dungeon-warden', 'boss', { enabled: false, disabledReason: '缺少战斗锚点' }),
    ])

    expect(item.available).toBe(false)
    expect(item.disabledReason).toBe('缺少战斗锚点')
  })

  it('rejects empty selections and counts outside the A-provided cap', () => {
    const options = getLocalBattleEntityOptions([option('ordinary-a', 'ordinary')])
    const selections = createLocalBattleMonsterSelection(options)

    expect(validateLocalBattleMonsterSelection(selections, options)).toEqual({
      ok: false,
      message: '请至少选择一种可用怪物',
    })

    selections['ordinary-a'] = { enabled: true, count: LOCAL_BATTLE_MONSTER_COUNT_MAX + 1 }
    expect(validateLocalBattleMonsterSelection(selections, options)).toEqual({
      ok: false,
      message: 'ordinary-a数量必须为 1-20 的整数',
    })
  })

  it('returns only enabled valid entities for the A session API', () => {
    const options = getLocalBattleEntityOptions([
      option('ordinary-a', 'ordinary'),
      option('elite-a', 'elite'),
    ])
    const selections = createLocalBattleMonsterSelection(options)
    selections['ordinary-a'] = { enabled: true, count: '3' }

    expect(validateLocalBattleMonsterSelection(selections, options)).toEqual({
      ok: true,
      config: [{ entityId: 'ordinary-a', count: 3 }],
    })
  })
})
