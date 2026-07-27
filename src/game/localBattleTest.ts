import type {
  LocalBattleTestMonsterConfig,
  LocalBattleTestSpawnOption,
} from './types'

export const LOCAL_BATTLE_MONSTER_COUNT_MIN = 1
export const LOCAL_BATTLE_MONSTER_COUNT_MAX = 20

export type LocalBattleMonsterCategory = LocalBattleTestSpawnOption['group']

export type LocalBattleEntityOption = {
  id: string
  name: string
  category: LocalBattleMonsterCategory
  categoryLabel: string
  available: boolean
  disabledReason?: string
  maxCount: number
}

export type LocalBattleMonsterSelection = {
  enabled: boolean
  count: number | string
}

export type LocalBattleMonsterConfig = LocalBattleTestMonsterConfig[]

const LOCAL_BATTLE_CATEGORY_ORDER: LocalBattleMonsterCategory[] = ['ordinary', 'elite', 'boss']

const categoryLabel = (category: LocalBattleMonsterCategory) => (
  category === 'ordinary' ? '普通怪' : category === 'elite' ? '精英' : 'Boss'
)

export const getLocalBattleEntityOptions = (
  spawnOptions: LocalBattleTestSpawnOption[] = [],
): LocalBattleEntityOption[] => {
  const seen = new Set<string>()
  return [...spawnOptions]
    .filter((option) => LOCAL_BATTLE_CATEGORY_ORDER.includes(option.group))
    .sort((left, right) => {
      const categoryOrder = LOCAL_BATTLE_CATEGORY_ORDER.indexOf(left.group) - LOCAL_BATTLE_CATEGORY_ORDER.indexOf(right.group)
      return categoryOrder || left.name.localeCompare(right.name, 'zh-CN') || left.entityId.localeCompare(right.entityId)
    })
    .flatMap((option) => {
      if (seen.has(option.entityId)) {
        return []
      }
      seen.add(option.entityId)
      return [{
        id: option.entityId,
        name: option.name,
        category: option.group,
        categoryLabel: categoryLabel(option.group),
        available: option.enabled,
        ...(option.disabledReason ? { disabledReason: option.disabledReason } : {}),
        maxCount: Math.min(LOCAL_BATTLE_MONSTER_COUNT_MAX, Math.max(LOCAL_BATTLE_MONSTER_COUNT_MIN, option.maxCount)),
      }]
    })
}

export const getLocalBattleEntityGroups = (spawnOptions: LocalBattleTestSpawnOption[] = []) => {
  const options = getLocalBattleEntityOptions(spawnOptions)
  return LOCAL_BATTLE_CATEGORY_ORDER.map((category) => ({
    category,
    label: categoryLabel(category),
    options: options.filter((option) => option.category === category),
  }))
}

export const createLocalBattleMonsterSelection = (options: LocalBattleEntityOption[] = []) => (
  Object.fromEntries(options.map((option) => [option.id, { enabled: false, count: LOCAL_BATTLE_MONSTER_COUNT_MIN }])) as Record<string, LocalBattleMonsterSelection>
)

const parseMonsterCount = (value: number | string, maxCount: number) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < LOCAL_BATTLE_MONSTER_COUNT_MIN || parsed > maxCount) {
    return undefined
  }
  return parsed
}

export const validateLocalBattleMonsterSelection = (
  selections: Record<string, LocalBattleMonsterSelection>,
  options: LocalBattleEntityOption[] = [],
) => {
  const selected = options.filter((option) => selections[option.id]?.enabled)
  if (selected.length === 0) {
    return { ok: false as const, message: '请至少选择一种可用怪物' }
  }

  for (const option of selected) {
    if (!option.available) {
      return { ok: false as const, message: `${option.name}不可生成：${option.disabledReason ?? '实体配置未完成'}` }
    }
    if (parseMonsterCount(selections[option.id]?.count ?? '', option.maxCount) === undefined) {
      return { ok: false as const, message: `${option.name}数量必须为 ${LOCAL_BATTLE_MONSTER_COUNT_MIN}-${option.maxCount} 的整数` }
    }
  }

  return {
    ok: true as const,
    config: selected.map((option) => ({
      entityId: option.id,
      count: parseMonsterCount(selections[option.id].count, option.maxCount)!,
    })) satisfies LocalBattleMonsterConfig,
  }
}
