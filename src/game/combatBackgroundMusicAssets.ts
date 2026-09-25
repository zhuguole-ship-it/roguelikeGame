const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')

export const COMBAT_BACKGROUND_MUSIC_ASSETS = Object.freeze({
  normal: Object.freeze({
    key: 'combat-music.normal-battle-1',
    path: 'assets/audio/combat-v1/normal-battle-1.ogg',
    publicUrl: `${baseUrl}assets/audio/combat-v1/normal-battle-1.ogg`,
    sha256: '7674013bd8c7d93782c3ba3e94aaee0314da6a0db0f0a1839dcbcf24da63bb76',
    durationSeconds: 162,
  }),
  boss: Object.freeze({
    key: 'combat-music.boss-battle-2',
    path: 'assets/audio/combat-v1/boss-battle-2.ogg',
    publicUrl: `${baseUrl}assets/audio/combat-v1/boss-battle-2.ogg`,
    sha256: '35efe4549e34dd0c436afffa8b92af0bb81ed52e579843aa997b0b242370a4dd',
    durationSeconds: 125,
  }),
})
