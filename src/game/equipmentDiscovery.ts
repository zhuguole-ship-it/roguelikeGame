import type { EquipmentItem } from './types'

const highRarityEquipment = new Set(['legacy', 'legendary'])

export const normalizeDiscoveredHighRarityEquipmentIds = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())))
}

export const isHighRarityEquipmentDiscoveryEligible = (item: Pick<EquipmentItem, 'rarity' | 'equipmentId'>) => {
  return Boolean(item.equipmentId && highRarityEquipment.has(item.rarity))
}

export const hasDiscoveredHighRarityEquipment = (ids: readonly string[] | undefined, equipmentId: string | undefined | null) => {
  return Boolean(equipmentId && ids?.includes(equipmentId))
}

export const recordDiscoveredHighRarityEquipmentId = (ids: readonly string[] | undefined, equipmentId: string | undefined | null) => {
  if (!equipmentId) {
    return normalizeDiscoveredHighRarityEquipmentIds(ids)
  }

  return normalizeDiscoveredHighRarityEquipmentIds([...(ids ?? []), equipmentId])
}
