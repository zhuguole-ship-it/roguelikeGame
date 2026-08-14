export type ChainEliteAssetId = 'dungeon-chain-captain' | 'dungeon-chain-wraith-elite'
export type ChainEliteActionSlot = 'idle' | 'move' | 'attack' | 'hit' | 'skill' | 'death'

export type ChainEliteActionMeta = {
  slot: ChainEliteActionSlot
  label: string
  sourceFolder: string
  projectFolder: string
  frameNames: readonly string[]
  fps: number
  loop: boolean
  combatAction: 'idle' | 'move' | 'attack' | 'hit' | 'skill' | 'death'
}

export type ChainEliteFrameAudit = {
  entityId: ChainEliteAssetId
  slot: ChainEliteActionSlot | 'iron-chain'
  frameNumber: number
  sourceRelativePath: string
  projectRelativePath: string
  sha256: string
  width: 192
  height: 192
}

export const CHAIN_ELITE_FRAME_SIZE = 192

export const CHAIN_ELITE_ASSET_BASE_PATHS: Record<ChainEliteAssetId, string> = {
  'dungeon-chain-captain': 'assets/monsters/dungeon-chain-captain',
  'dungeon-chain-wraith-elite': 'assets/monsters/dungeon-chain-wraith-elite',
}

const sequence = (prefix: string, count: number) => (
  Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}.png`)
)

export const CHAIN_ELITE_ACTIONS: Record<ChainEliteAssetId, Record<ChainEliteActionSlot, ChainEliteActionMeta>> = {
  'dungeon-chain-captain': {
    idle: { slot: 'idle', label: '待机', sourceFolder: 'Idle', projectFolder: 'Idle', frameNames: sequence('Idle', 4), fps: 4, loop: true, combatAction: 'idle' },
    move: { slot: 'move', label: '移动', sourceFolder: 'Move', projectFolder: 'Move', frameNames: sequence('Move', 4), fps: 6, loop: true, combatAction: 'move' },
    attack: { slot: 'attack', label: '连环斩', sourceFolder: 'Move+Attack', projectFolder: 'Move-Attack', frameNames: sequence('Move+Attack', 4), fps: 8, loop: false, combatAction: 'attack' },
    hit: { slot: 'hit', label: '受击', sourceFolder: 'Hit', projectFolder: 'Hit', frameNames: sequence('Hit', 4), fps: 8, loop: false, combatAction: 'hit' },
    skill: { slot: 'skill', label: '断链号令', sourceFolder: 'Skill', projectFolder: 'Skill', frameNames: sequence('Skill', 6), fps: 7, loop: false, combatAction: 'skill' },
    death: { slot: 'death', label: '死亡', sourceFolder: 'Dead', projectFolder: 'Dead', frameNames: sequence('Death', 3), fps: 3, loop: false, combatAction: 'death' },
  },
  'dungeon-chain-wraith-elite': {
    idle: { slot: 'idle', label: '待机', sourceFolder: 'Idle', projectFolder: 'Idle', frameNames: sequence('Standby', 4), fps: 4, loop: true, combatAction: 'idle' },
    move: { slot: 'move', label: '移动', sourceFolder: 'Move', projectFolder: 'Move', frameNames: sequence('Move', 4), fps: 6, loop: true, combatAction: 'move' },
    attack: { slot: 'attack', label: '魂链抽打', sourceFolder: 'Move&Attack', projectFolder: 'Move-Attack', frameNames: sequence('Move+Attack', 4), fps: 8, loop: false, combatAction: 'attack' },
    hit: { slot: 'hit', label: '受击', sourceFolder: 'Hit', projectFolder: 'Hit', frameNames: sequence('Hit', 4), fps: 8, loop: false, combatAction: 'hit' },
    skill: { slot: 'skill', label: '远程拉拽', sourceFolder: 'Skill', projectFolder: 'Skill', frameNames: sequence('Skill', 4), fps: 6, loop: false, combatAction: 'skill' },
    death: { slot: 'death', label: '死亡', sourceFolder: 'Dead', projectFolder: 'Dead', frameNames: sequence('Death', 4), fps: 4, loop: false, combatAction: 'death' },
  },
}

const sourceRoots: Record<ChainEliteAssetId, string> = {
  'dungeon-chain-captain': '骷髅头',
  'dungeon-chain-wraith-elite': '幽灵切图',
}

const chainEliteFrameHashes: Record<ChainEliteAssetId, Record<ChainEliteActionSlot | 'iron-chain', readonly string[]>> = {
  'dungeon-chain-captain': {
    idle: ['033e94f70aae0a63520b160034ba9e87c133fae9e6f51d725420336034537818', '3e438ff5087bd224440e896342713bb9b1f94bb4cb079150298c3d913484dde2', 'e3845cef6e88abd748f2e200f977cf90a914cc901eb4cccb370d3bfd0de5ec26', 'dd7301b1890d4e93e0fa2c6483e48436310c1e9cb8bc0d43a878793ebe03f360'],
    move: ['530f17f9c0c6731a641a67e192be3168d949ce2e7e4a0f3db4f733a773e629f4', '203f5fba8cc79c1f12ca4131cdd5d1e0417ea7c5cab6bdd1a8ca408b4ad50faa', 'de92abd0f26e38187b72e3513902b210797b1672f636fa231e9c8d8447789c34', '13327c7fa0a5881b6230fd21cc83b4ea6ecbf58e85f8815bdd7d99d5a7233bb4'],
    attack: ['590b9b02e397c7225e3d4eef742d0d25e74f43298829c03b732dc4af89cd8796', 'a581a14d5c3f198e35dbefd37d494951977c41a4739d0a424e7a054567687e9a', '5bf6b0d03e0ff625fb7c42306d73001657096848691147d63fada4802a3d3004', '76c3d6225515e42a37c4a5f76ca2c04462a40c6c08049af38a59df8cea97b269'],
    hit: ['62b61011a6ac2e3164d56013393511d02a68cbc9032ea3f297f4a218dce9ed19', 'fe9437fcd18f0bb204a05dba7df6f853cd1f4ef6bf6542e8762aa105bc768887', 'cc2e2d076322af5ec01ad69c2063f6977d8a247916bba86314a794723bb204dd', '854c99016947face1ad56d0df8cef48d58e51639e5bd10e030ab927540ea9e2e'],
    skill: ['5f902aa9ba8b150852ed4f43519aca019f671df96dd97835583a0f8c57abbf00', '6698545271b7d903a50dc1010a3e389c873b38a9e33ec93fe53717f6c40c0f3d', '08b9d27dba08e1484dab632a5235a497c3b8d727e34e2d261a919a1760cd860b', '6a1967f5fb582a12c068bb868d813f866b3a5bb899c55caed28d52b7d7d40849', '08b9d27dba08e1484dab632a5235a497c3b8d727e34e2d261a919a1760cd860b', '5f902aa9ba8b150852ed4f43519aca019f671df96dd97835583a0f8c57abbf00'],
    death: ['81a2f2c8014761f0235f80d349c652e5c17fe3e7869d42f88152d5ec8a25a535', '3b2fc8c3c99ff0d2b9ae2d30f05bd42024b168715e2ea84a892743ba85dcd592', '5d59379ad31f3ed1d93715dcd97b9827f52ad07eef76e677766f62546e6b1bb4'],
    'iron-chain': [],
  },
  'dungeon-chain-wraith-elite': {
    idle: ['f84f6a970f8403abb8c0d7e606fc9e7a8eb21681ed2fdbf0c2cb45cd86bc0e66', '96b9115dc8ba156b01dcf832a466289ea12c97cd8426df3419547e5b039dd424', '450637c4eac2b7518741ecfe6c74f2f0dbc67d7567f09833e2292534aa6a2893', '3d763b9389bbad07458ca1ee284c414ee8ed32c9e5ce14c42643a95bbeeeab71'],
    move: ['995af1897598084aed3b84fbd7a65306ea23adaa3b0fe6744ad8c3cab6912827', '4d12c55c7e1fd080a02beb9c538c4550923c8cbaa9fba7a9e1cab8d530096d4f', 'b11a035b33c217977f75e622db5063535ed1d6cc65a39a11eb36f3112c8b7423', '98ddc7af5da4c7e152a30b15ee0156d23fa0ae8b62394ecbf0d32b47a2a987a1'],
    attack: ['1e9b6dcee2ddac2528a0d73e6032ff17e9ff418740c86d2cc88b242ed7074306', 'c3a8a367d5688832e89affafe860d953f60a79a5735e2a450bd94de69e993758', 'dca7e926f02451bc9f599dd3e10146e18c621219c992194929605dc71a2cec7c', '3ed5385c34d12e2fce3aefc2d8e4d0fe004bc6b232dba7b3a22713a8f9fc23da'],
    hit: ['4622e6c20a6574a336cc0c006d7421e141a4f28fc8b6885be037abcf928f7cf4', '7fff496d33df387f764b2a56c0afe5fa31fc1b0d15729b2a43a555c2f089e958', 'e1104577fadb933c43d3990d6f648c482651e7ac0081882a87f20a2f8af03127', '3b5248c866e486fafede7e32acc6f25114288af255d9390e80b90d7d348318b6'],
    skill: ['b0b2dcb97e9b51c9661c92e3b19ceea612082b30bc602bd54e2e2943c6888058', 'b040077ecee216f2a6d548d534484dbad38c0fdc6b5565971ef5d735ffa19df6', '032d06becdf4752f5c1f5b170d4cc7d0a63bd3e0a36a6c22ada0eb622e8e1f0b', 'df5f4f2e079627382fc8fe4444989af0c931039abdf3fe9d28d11c834b12ac73'],
    death: ['108ac0019f42aff005d45eb7a8869ca386aa366b2576a48bf3ff96ef606fef3c', '65aa95835665d429e73f43582cdc543e86bafe2b216301d285e1eb13749235dd', '1c6b8e5a1e975de95de930225e831c5ed2b740a4d79fbdae4ca7498f2d544fb6', 'c7998abad9cc6bd7759c65832534d4ec060d8aca07b35cc368180da2b4794b5e'],
    'iron-chain': ['aba560935d2962133cf72b8ad27c4c1b92ee4258031570be0a73a80e119c3d3d', '355cc9664046519b8337619ffeef106e65a073b17d99848a8437d9aaef4d9a36', 'c9b94933ac3face9f510e872e9a60493a4e05ba4f520c960b75bc49071577c39', '8e9395cfa3be84d15f5f9183f112b421c4f9a2fb98ceca77859100295bc018ea'],
  },
}

export const getChainEliteFramePath = (entityId: ChainEliteAssetId, slot: ChainEliteActionSlot, frameIndex: number) => {
  const meta = CHAIN_ELITE_ACTIONS[entityId][slot]
  const index = Math.max(0, Math.min(meta.frameNames.length - 1, Math.floor(frameIndex)))
  return `${CHAIN_ELITE_ASSET_BASE_PATHS[entityId]}/${meta.projectFolder}/${meta.frameNames[index]}`
}

export const getChainEliteFrameUrls = (entityId: ChainEliteAssetId, slot: ChainEliteActionSlot) => (
  CHAIN_ELITE_ACTIONS[entityId][slot].frameNames.map((_, index) => getChainEliteFramePath(entityId, slot, index))
)

export const getChainElitePublicFrameUrls = (entityId: ChainEliteAssetId, slot: ChainEliteActionSlot) => (
  getChainEliteFrameUrls(entityId, slot).map((path) => `${import.meta.env.BASE_URL}${path}`)
)

export const IRON_CHAIN_FRAME_NAMES = sequence('Iron Chain', 4)
export const IRON_CHAIN_SOURCE_CROP = { x: 12, y: 84, width: 168, height: 28 } as const

export const getChainWraithIronChainPath = (frameIndex: number) => {
  const index = Math.max(0, Math.min(IRON_CHAIN_FRAME_NAMES.length - 1, Math.floor(frameIndex)))
  return `${CHAIN_ELITE_ASSET_BASE_PATHS['dungeon-chain-wraith-elite']}/Iron-Chain/${IRON_CHAIN_FRAME_NAMES[index]}`
}

export const getChainWraithIronChainFrameUrls = () => (
  IRON_CHAIN_FRAME_NAMES.map((_, index) => getChainWraithIronChainPath(index))
)

export const getChainWraithPublicIronChainFrameUrls = () => (
  getChainWraithIronChainFrameUrls().map((path) => `${import.meta.env.BASE_URL}${path}`)
)

/** Source-pixel hand anchors measured from the four real wraith Skill frames. */
export const CHAIN_WRAITH_SKILL_HAND_ANCHORS = [
  { x: 132, y: 30, label: '右手出链点' },
  { x: 138, y: 32, label: '右手出链点' },
  { x: 141, y: 30, label: '右手出链点' },
  { x: 137, y: 38, label: '右手出链点' },
] as const

/**
 * Alpha bottoms measured from the project Skill PNGs with the renderer's
 * alpha > 8 threshold. Keeping this static lets the hand resolver match the
 * feet-aligned draw without waiting for an Image decode or scanning pixels at
 * render time.
 */
export const CHAIN_WRAITH_SKILL_VISIBLE_BOTTOMS = [159, 160, 159, 162] as const

export const getChainWraithSkillHandAnchor = (frameIndex: number) => (
  CHAIN_WRAITH_SKILL_HAND_ANCHORS[Math.max(0, Math.min(CHAIN_WRAITH_SKILL_HAND_ANCHORS.length - 1, Math.floor(frameIndex)))]
)

export const getChainWraithSkillVisibleBottom = (frameIndex: number) => (
  CHAIN_WRAITH_SKILL_VISIBLE_BOTTOMS[Math.max(0, Math.min(CHAIN_WRAITH_SKILL_VISIBLE_BOTTOMS.length - 1, Math.floor(frameIndex)))]
)

const chainEliteBodyFrameAudit: ChainEliteFrameAudit[] = (
  (Object.keys(CHAIN_ELITE_ACTIONS) as ChainEliteAssetId[]).flatMap((entityId) => (
    (Object.keys(CHAIN_ELITE_ACTIONS[entityId]) as ChainEliteActionSlot[]).flatMap((slot) => {
      const meta = CHAIN_ELITE_ACTIONS[entityId][slot]
      return meta.frameNames.map((frameName, index): ChainEliteFrameAudit => ({
        entityId,
        slot,
        frameNumber: index + 1,
        sourceRelativePath: `${sourceRoots[entityId]}/${meta.sourceFolder}/${frameName}`,
        projectRelativePath: getChainEliteFramePath(entityId, slot, index),
        sha256: chainEliteFrameHashes[entityId][slot][index],
        width: 192,
        height: 192,
      }))
    })
  ))
)

const chainWraithIronChainFrameAudit: ChainEliteFrameAudit[] = IRON_CHAIN_FRAME_NAMES.map((frameName, index) => ({
    entityId: 'dungeon-chain-wraith-elite' as const,
    slot: 'iron-chain' as const,
    frameNumber: index + 1,
    sourceRelativePath: `幽灵切图/Iron Chain/${frameName}`,
    projectRelativePath: getChainWraithIronChainPath(index),
    sha256: chainEliteFrameHashes['dungeon-chain-wraith-elite']['iron-chain'][index],
    width: 192,
    height: 192,
  }))

export const CHAIN_ELITE_FRAME_AUDIT: readonly ChainEliteFrameAudit[] = [
  ...chainEliteBodyFrameAudit,
  ...chainWraithIronChainFrameAudit,
]
