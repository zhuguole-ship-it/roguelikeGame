import { describe, expect, it } from 'vitest'

import { ARCHER_CORE_SKILL_IDS, ARCHER_SKILL_EVOLUTIONS } from './archerSkillEvolution'
import { PLAYER_ARCHER_ACTIONS, getPlayerArcherFrameUrls } from './archerAssetFrames'
import { CAMPAIGN_MONSTER_THEMES } from './campaignMonsters'
import {
  buildCombatLoadingDependencyDescriptor,
  buildCombatSceneAssetDependencyDescriptor,
  createIdleCombatLaunchGate,
  createPendingCombatLaunchGate,
  markCombatLaunchFadeStarted,
} from './combatLoading'
import {
  HOME_SCENE_ASSET_MANIFEST_V1,
  getHomeSceneSkillIconResource,
} from './homeSceneAssetManifest'
import {
  getSceneAssetCacheKey,
  resolveSceneAssetCanonicalIdentity,
} from './sceneAssetLoading'
import { SHARED_SCENE_ASSET_CONTENT_VERSIONS } from './sharedSceneAssetContentVersions'

describe('combat loading contract', () => {
  it('builds one stable, current-campaign dependency descriptor without other campaign monsters', () => {
    const descriptor = buildCombatLoadingDependencyDescriptor({
      runtimeMode: 'formal-run',
      campaign: 2,
      level: 23,
      difficulty: 'hard',
      battlefieldMode: 'infinite',
      professionId: 'archer',
    })
    const campaignTwo = CAMPAIGN_MONSTER_THEMES[1]
    const campaignOneIds = new Set(CAMPAIGN_MONSTER_THEMES[0].normalPool.map((enemy) => enemy.id))

    expect(descriptor.key).toBe('combat-loading-v1:formal-run:campaign-2:level-23:hard:infinite:archer')
    expect(descriptor.enemies.map((enemy) => enemy.archetypeId)).toEqual([
      ...campaignTwo.normalPool,
      ...campaignTwo.elitePool,
      campaignTwo.boss,
    ].map((enemy) => enemy.id))
    expect(descriptor.enemies.some((enemy) => campaignOneIds.has(enemy.archetypeId))).toBe(false)
    expect(descriptor.enemies.every((enemy) => enemy.actionSlots.length > 0)).toBe(true)
    expect(descriptor.environment.obstacleAssetIds).toEqual([])
    expect(descriptor.environment.decorationAssetIds).toEqual([])
    const resources = buildCombatSceneAssetDependencyDescriptor(descriptor.target).resources
    expect(resources.some((resource) => resource.key.startsWith('environment.c1.floor.'))).toBe(false)
    expect(resources.some((resource) => resource.key.startsWith('enemy-projectile.c1.'))).toBe(false)
    expect(resources.some((resource) => resource.key === 'environment.combat-mask')).toBe(true)
  })

  it('includes the complete character, player-skill, shared battle, and transition semantic domains', () => {
    const descriptor = buildCombatLoadingDependencyDescriptor({
      runtimeMode: 'local-battle-test',
      campaign: 1,
      level: 1,
      difficulty: 'normal',
      battlefieldMode: 'infinite',
      professionId: 'archer',
    })

    expect(descriptor.character.actionIds).toEqual(Object.keys(PLAYER_ARCHER_ACTIONS).sort())
    expect(descriptor.playerSkills.familyIds).toEqual([...ARCHER_CORE_SKILL_IDS].sort())
    expect(descriptor.playerSkills.evolutionIds).toEqual(ARCHER_SKILL_EVOLUTIONS.map((entry) => entry.id).sort())
    expect(descriptor.environment.obstacleAssetIds.length).toBeGreaterThan(0)
    expect(descriptor.environment.decorationAssetIds.length).toBeGreaterThan(0)
    expect(descriptor.shared.bundleIds).toEqual(expect.arrayContaining([
      'combat-ui',
      'combat-fonts',
      'combat-icons',
      'combat-audio',
      'player-skill-fx',
      'battle-config',
    ]))
    expect(descriptor.transitionAssetIds).toEqual([
      'loading-transition-background',
      'loading-transition-title',
      'loading-transition-final',
    ])
  })

  it('normalizes floor twenty-two to boss arena and keeps gate transitions idempotent', () => {
    const descriptor = buildCombatLoadingDependencyDescriptor({
      runtimeMode: 'development-acceptance',
      campaign: 1,
      level: 22,
      difficulty: 'nightmare',
      battlefieldMode: 'infinite',
      professionId: 'archer',
    })
    const pending = createPendingCombatLaunchGate('launch-1', descriptor)
    const fading = markCombatLaunchFadeStarted(pending, 'launch-1')

    expect(descriptor.target.battlefieldMode).toBe('boss-arena')
    expect(fading.status).toBe('fading-out')
    expect(markCombatLaunchFadeStarted(fading, 'launch-1')).toBe(fading)
    expect(markCombatLaunchFadeStarted(fading, 'stale-launch')).toBe(fading)
    expect(createIdleCombatLaunchGate('launch-1')).toMatchObject({
      status: 'idle',
      active: false,
      lastCompletedLaunchId: 'launch-1',
    })
  })

  it('expands the semantic descriptor into B2 loader resources without other campaign enemy actions', () => {
    const manifestInput = buildCombatSceneAssetDependencyDescriptor({
      runtimeMode: 'formal-run',
      campaign: 1,
      level: 1,
      difficulty: 'normal',
      battlefieldMode: 'infinite',
      professionId: 'archer',
    })
    const keys = manifestInput.resources.map((resource) => resource.key)

    expect(manifestInput).toMatchObject({
      manifestVersion: 'combat-loading-v1',
      targetCampaign: 1,
      targetLevel: 1,
      selectedCharacterId: 'archer',
      runMode: 'formal-run',
    })
    expect(keys).toEqual(expect.arrayContaining([
      'environment.c1.floor.1',
      'environment.combat-mask',
      'enemy-projectile.c1.skeleton-arrow',
      'enemy-skill-fx.c1.fire-sac.1',
      'enemy.dungeon-skeleton-warrior.idle.1',
      'enemy.dungeon-warden.death.1',
      'combat-hud.portrait',
      'transition.background',
      'transition.title',
      'transition.final',
      'combat-audio.archer-basic-attack',
    ]))
    expect(keys.some((key) => key.includes('vampire-thrall'))).toBe(false)
    expect(manifestInput.resources.filter((resource) => resource.domain === 'enemy-actions').length).toBeGreaterThan(0)
    expect(manifestInput.resources.filter((resource) => resource.domain === 'player-actions').length).toBeGreaterThan(0)
    expect(manifestInput.resources.every((resource) => (
      resource.kind === 'font' ? Boolean(resource.fontFamily) : Boolean(resource.url)
    ))).toBe(true)
  })

  it('uses one neutral content identity for every URL shared by home and combat', () => {
    const combatResources = buildCombatSceneAssetDependencyDescriptor({
      runtimeMode: 'formal-run',
      campaign: 1,
      level: 1,
      difficulty: 'normal',
      battlefieldMode: 'infinite',
      professionId: 'archer',
    }).resources
    const homeByLogicalUrl = new Map(HOME_SCENE_ASSET_MANIFEST_V1.resources.flatMap((resource) => {
      const logicalUrl = resolveSceneAssetCanonicalIdentity(resource).logicalUrl
      return logicalUrl ? [[logicalUrl, resource] as const] : []
    }))
    const sharedPairs = combatResources.flatMap((combatResource) => {
      const logicalUrl = resolveSceneAssetCanonicalIdentity(combatResource).logicalUrl
      const homeResource = logicalUrl ? homeByLogicalUrl.get(logicalUrl) : undefined
      return homeResource ? [{ logicalUrl, homeResource, combatResource }] : []
    })

    expect(sharedPairs.length).toBeGreaterThan(0)
    expect(sharedPairs.flatMap(({ logicalUrl, homeResource, combatResource }) => (
      combatResource.version === homeResource.version
        && getSceneAssetCacheKey(combatResource) === getSceneAssetCacheKey(homeResource)
        ? []
        : [{ logicalUrl, homeVersion: homeResource.version, combatVersion: combatResource.version }]
    ))).toEqual([])

    const idleUrl = getPlayerArcherFrameUrls('idle')[0]!
    const idlePair = sharedPairs.find(({ logicalUrl }) => logicalUrl === resolveSceneAssetCanonicalIdentity({
      key: 'idle.lookup', domain: 'test', kind: 'image', version: 'ignored', url: idleUrl,
    }).logicalUrl)
    expect(idlePair?.homeResource.key).toBe('character.idle.1')
    expect(idlePair?.combatResource.version).toBe(SHARED_SCENE_ASSET_CONTENT_VERSIONS.playerArcherFrames)

    const skillId = ARCHER_CORE_SKILL_IDS[0]!
    const homeSkillIcon = getHomeSceneSkillIconResource(skillId)!
    const combatSkillIcon = combatResources.find((resource) => (
      resolveSceneAssetCanonicalIdentity(resource).logicalUrl
      === resolveSceneAssetCanonicalIdentity(homeSkillIcon).logicalUrl
    ))
    expect(combatSkillIcon?.version).toBe(SHARED_SCENE_ASSET_CONTENT_VERSIONS.archerSkillIcons)
    expect(getSceneAssetCacheKey(combatSkillIcon!)).toBe(getSceneAssetCacheKey(homeSkillIcon))
  })
})
