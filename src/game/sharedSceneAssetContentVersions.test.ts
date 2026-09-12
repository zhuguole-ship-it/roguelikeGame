import { describe, expect, it } from 'vitest'

import {
  getSharedSceneAssetContentVersion,
  getSharedSceneAssetContentVersionForUrl,
  SHARED_SCENE_ASSET_CONTENT_VERSIONS,
  SHARED_SCENE_ASSET_CONTENT_VERSION_RULES,
} from './sharedSceneAssetContentVersions'

describe('shared scene asset content versions', () => {
  it('uses content-owned revisions rather than home or combat scene names', () => {
    expect(getSharedSceneAssetContentVersion('playerArcherFrames')).toBe('player-archer-png-content-v1')
    expect(getSharedSceneAssetContentVersion('archerSkillIcons')).toBe('archer-skill-icon-png-content-v1')
    expect(getSharedSceneAssetContentVersion('monsterGuideCombatFrames')).toBe('monster-guide-png-content-v1')
    expect(Object.values(SHARED_SCENE_ASSET_CONTENT_VERSIONS).join(',')).not.toMatch(/home|combat|loading/)
    expect(SHARED_SCENE_ASSET_CONTENT_VERSION_RULES).toHaveLength(11)
    expect(getSharedSceneAssetContentVersionForUrl('/roguelikeGame/assets/player/archer/idle/Idle-1.png')).toBe(
      SHARED_SCENE_ASSET_CONTENT_VERSIONS.playerArcherFrames,
    )
    expect(getSharedSceneAssetContentVersionForUrl('/roguelikeGame/assets/skills/archer/icons/%E7%A9%BF%E5%88%BA%E7%AE%AD.png')).toBe(
      SHARED_SCENE_ASSET_CONTENT_VERSIONS.archerSkillIcons,
    )
    expect(getSharedSceneAssetContentVersionForUrl('/roguelikeGame/assets/monsters/dungeon-warden/Idle/Idle-1@3x.png')).toBe(
      SHARED_SCENE_ASSET_CONTENT_VERSIONS.monsterGuideCombatFrames,
    )
    expect(getSharedSceneAssetContentVersionForUrl('/roguelikeGame/assets/monsters/dungeon-warden/Attack/Attack-1@3x.png')).toBeUndefined()
    expect(getSharedSceneAssetContentVersionForUrl('/assets/ui/home-only.png')).toBeUndefined()
  })
})
