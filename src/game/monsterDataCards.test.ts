import { describe, expect, it } from 'vitest'

import { CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE } from './campaignMonsters'
import { DOCUMENTED_MONSTER_DROP_PROFILES, getMonsterDataCard, getMonsterDropProfile } from './monsterDataCards'

const documentedArchetypeIds = [
  'corrosive-slime',
  'dungeon-skeleton-warrior',
  'dungeon-skeleton-archer',
  'dungeon-jailer',
  'dungeon-rat-swarm',
  'dungeon-chain-wraith',
  'dungeon-hellhound',
  'dungeon-splitting-ooze',
  'dungeon-explosive-fire-sac',
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
  it('keeps campaign battle archetypes, guide cards, and data cards on the same ids', () => {
    const campaignEntries = CAMPAIGN_MONSTER_THEMES.flatMap((theme) => [
      ...theme.normalPool.map((entry) => ({ theme, entry, bucket: 'normal' as const })),
      ...theme.elitePool.map((entry) => ({ theme, entry, bucket: 'elite' as const })),
      { theme, entry: theme.boss, bucket: 'boss' as const },
    ])
    const ids = campaignEntries.map(({ entry }) => entry.id)

    expect(new Set(ids).size).toBe(ids.length)
    campaignEntries.forEach(({ theme, entry, bucket }) => {
      const card = getMonsterDataCard(entry.id)
      expect(card, entry.id).toBeTruthy()
      expect(card?.campaign, entry.id).toBe(theme.campaign)
      expect(card?.name, entry.id).toBe(entry.name)
      expect(card?.kind, entry.id).toBe(entry.kind)
      if (bucket === 'normal') {
        expect(entry.kind, entry.id).not.toMatch(/elite|boss/)
      }
      if (bucket === 'elite') {
        expect(entry.kind, entry.id).toBe('elite')
      }
      if (bucket === 'boss') {
        expect(entry.kind, entry.id).toBe('boss')
      }
    })

    expect(getMonsterDataCard(CORROSIVE_SLIME_ARCHETYPE.id)).toMatchObject({
      name: CORROSIVE_SLIME_ARCHETYPE.name,
      kind: CORROSIVE_SLIME_ARCHETYPE.kind,
    })
  })

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

  it('keeps dungeon hellhound combat and guide data synchronized as bite-only fast melee', () => {
    const theme = CAMPAIGN_MONSTER_THEMES[0]
    const hellhound = theme.normalPool.find((entry) => entry.id === 'dungeon-hellhound')
    const card = getMonsterDataCard('dungeon-hellhound')

    expect(hellhound).toMatchObject({
      skillTrait: 'none',
      speedMultiplier: 2.03,
    })
    expect(card).toMatchObject({
      name: '地狱犬',
      speed: 162,
      basicAttack: { label: '撕咬' },
    })
    expect(card?.skill).toBeUndefined()
    expect(card?.behaviorTags).not.toContain('冲锋')
    expect(card?.behaviorTags).not.toContain('火焰吐息')
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
