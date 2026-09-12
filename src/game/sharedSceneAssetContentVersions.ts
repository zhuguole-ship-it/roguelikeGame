/**
 * Content revisions for physical image bytes shared by more than one scene.
 * Consumers must use these values instead of assigning a home/combat version
 * to the same logical URL.
 */
export const SHARED_SCENE_ASSET_CONTENT_VERSIONS = Object.freeze({
  playerArcherFrames: 'player-archer-png-content-v1',
  archerSkillIcons: 'archer-skill-icon-png-content-v1',
  monsterGuideCombatFrames: 'monster-guide-png-content-v1',
} as const)

export type SharedSceneAssetContentVersionKey = keyof typeof SHARED_SCENE_ASSET_CONTENT_VERSIONS

export const SHARED_SCENE_ASSET_CONTENT_VERSION_RULES = Object.freeze([
  Object.freeze({
    key: 'playerArcherFrames' as const,
    logicalPathSegment: '/assets/player/archer/',
    version: SHARED_SCENE_ASSET_CONTENT_VERSIONS.playerArcherFrames,
  }),
  Object.freeze({
    key: 'archerSkillIcons' as const,
    logicalPathSegment: '/assets/skills/archer/icons/',
    version: SHARED_SCENE_ASSET_CONTENT_VERSIONS.archerSkillIcons,
  }),
  ...[
    '/assets/monsters/dungeon-splitting-ooze/Idle/Idle-1.png',
    '/assets/monsters/dungeon-explosive-fire-sac/Idle/Idle-1.png',
    '/assets/monsters/dungeon-chain-captain/Idle/Idle-1.png',
    '/assets/monsters/dungeon-jailer-chief/Idle/Idle-1.png',
    '/assets/monsters/dungeon-chain-wraith-elite/Idle/Standby-1.png',
    '/assets/monsters/skeleton-warrior-pt/Hurt/Hurt-1.png',
    '/assets/monsters/skeleton-archer-image2/Idle/Idle-1@3x.png',
    '/assets/monsters/hellhound-image2/Idle/Idle-1@3x.png',
    '/assets/monsters/dungeon-warden/Idle/Idle-1@3x.png',
  ].map((logicalPathSegment) => Object.freeze({
    key: 'monsterGuideCombatFrames' as const,
    logicalPathSegment,
    version: SHARED_SCENE_ASSET_CONTENT_VERSIONS.monsterGuideCombatFrames,
  })),
])

export const getSharedSceneAssetContentVersion = (key: SharedSceneAssetContentVersionKey) => (
  SHARED_SCENE_ASSET_CONTENT_VERSIONS[key]
)

/** Returns the shared physical-content revision without assigning scene ownership. */
export const getSharedSceneAssetContentVersionForUrl = (logicalUrl: string) => {
  const pathname = new URL(logicalUrl, 'https://scene-assets.invalid/').pathname
  return SHARED_SCENE_ASSET_CONTENT_VERSION_RULES.find(({ logicalPathSegment }) => (
    pathname.includes(logicalPathSegment)
  ))?.version
}
