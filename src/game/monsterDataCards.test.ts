import { describe, expect, it } from 'vitest'

import { DOCUMENTED_MONSTER_DROP_PROFILES, getMonsterDropProfile } from './monsterDataCards'

const documentedArchetypeIds = [
  'corrosive-slime',
  'dungeon-skeleton-warrior',
  'dungeon-skeleton-archer',
  'dungeon-jailer',
  'dungeon-rat-swarm',
  'dungeon-chain-wraith',
  'dungeon-hellhound',
  'vampire-thrall',
  'blood-bat-swarm',
  'bloodline-duelist',
  'blood-mage',
  'gargoyle',
  'werewolf-scout',
  'wolf-pack',
  'moonclaw-berserker',
  'forest-dryad',
  'bitten-hunter',
  'swamp-witch',
  'poison-frog',
  'mud-golem',
  'curse-raven',
  'swamp-wraith',
  'orc-infantry',
  'orc-axe-thrower',
  'war-drum-shaman',
  'warg-rider',
  'orc-shieldguard',
  'fallen-elf-archer',
  'elf-bladedancer',
  'treant-guardian',
  'starlight-priest',
  'centaur-ranger',
  'goblin-bomber',
  'goblin-grenadier',
  'troll-miner',
  'troll-brute',
  'runaway-minecart',
  'murloc-warrior',
  'murloc-spearthrower',
  'tide-priest',
  'deep-crab-guard',
  'electric-eel',
  'minotaur-charger',
  'maze-axeguard',
  'centaur-raider',
  'maze-priest',
  'stone-guardian',
  'dragonkin-warrior',
  'young-fire-drake',
  'dragonblood-priest',
  'lava-troll',
  'enslaved-elite',
]

describe('monster data card drop profiles', () => {
  it('keeps every documented monster on an explicit structured drop profile', () => {
    expect(Object.keys(DOCUMENTED_MONSTER_DROP_PROFILES).sort()).toEqual([...documentedArchetypeIds].sort())

    documentedArchetypeIds.forEach((archetypeId) => {
      const profile = getMonsterDropProfile(archetypeId)
      expect(profile, archetypeId).toBe(DOCUMENTED_MONSTER_DROP_PROFILES[archetypeId])
      expect(profile.crystal.type).toMatch(/none|small|medium/)
      expect(profile.crystal.chance).toBeGreaterThanOrEqual(0)
      expect(profile.crystal.chance).toBeLessThanOrEqual(1)
      expect(profile.equipmentPools.every((pool) => ['pierce', 'spread', 'control', 'beast', 'general'].includes(pool))).toBe(true)
    })
  })

  it('matches the documented corrected crystal and equipment rows for known edge cases', () => {
    expect(getMonsterDropProfile('corrosive-slime')).toMatchObject({
      crystal: { type: 'small', chance: 0.35, min: 0, max: 1 },
      equipmentTier: 'fodder',
    })
    expect(getMonsterDropProfile('blood-bat-swarm')).toMatchObject({
      crystal: { type: 'small', chance: 0.35, min: 1, max: 1 },
      equipmentTier: 'fodder',
      equipmentPools: ['general'],
    })
    expect(getMonsterDropProfile('wolf-pack')).toMatchObject({
      crystal: { type: 'small', chance: 0.35, min: 1, max: 1 },
      equipmentTier: 'fodder',
      equipmentPools: ['general'],
    })
    expect(getMonsterDropProfile('starlight-priest')).toMatchObject({
      crystal: { type: 'medium', chance: 0.35, min: 1, max: 1 },
    })
    expect(getMonsterDropProfile('troll-brute')).toMatchObject({
      crystal: { type: 'medium', chance: 1, min: 1, max: 1 },
    })
    expect(getMonsterDropProfile('runaway-minecart')).toMatchObject({
      crystal: { type: 'small', chance: 1, min: 1, max: 1 },
      equipmentPools: ['control'],
    })
    expect(getMonsterDropProfile('dragonblood-priest')).toMatchObject({
      crystal: { type: 'medium', chance: 0.35, min: 1, max: 1 },
      equipmentPools: ['general'],
    })
    expect(getMonsterDropProfile('lava-troll')).toMatchObject({
      crystal: { type: 'medium', chance: 1, min: 1, max: 1 },
    })
    expect(getMonsterDropProfile('enslaved-elite')).toMatchObject({
      crystal: { type: 'medium', chance: 1, min: 1, max: 1 },
      equipmentTier: 'endgame-pressure',
    })
  })

  it('falls back to no rewards for undocumented archetypes instead of parsing display text', () => {
    expect(getMonsterDropProfile('theme-melee')).toEqual({
      crystal: { type: 'none', chance: 0, min: 0, max: 0, expValue: 0 },
      equipmentTier: 'none',
      equipmentPools: [],
    })
  })
})
