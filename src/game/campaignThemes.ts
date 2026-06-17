export type CampaignTheme = {
  stage: number
  name: string
  floor: string
  floorAlt: string
  floorDark: string
  floorLine: string
  accent: string
  accentSoft: string
  warning: string
  shadow: string
  prop: string
  metal: string
}

const CAMPAIGN_THEMES: CampaignTheme[] = [
  {
    stage: 1,
    name: '死契地牢',
    floor: '#17241d',
    floorAlt: '#213129',
    floorDark: '#0b1410',
    floorLine: '#52695e',
    accent: '#7dd3fc',
    accentSoft: '#1d4f63',
    warning: '#f43f5e',
    shadow: '#050a07',
    prop: '#5e5a4f',
    metal: '#8b8270',
  },
  {
    stage: 2,
    name: '吸血鬼古堡',
    floor: '#251419',
    floorAlt: '#33181e',
    floorDark: '#0e080b',
    floorLine: '#8a343c',
    accent: '#ef4444',
    accentSoft: '#4a1118',
    warning: '#fb7185',
    shadow: '#070407',
    prop: '#5b3416',
    metal: '#c59b63',
  },
  {
    stage: 3,
    name: '狼人黑森林',
    floor: '#14211e',
    floorAlt: '#1c302b',
    floorDark: '#07110f',
    floorLine: '#5f7d86',
    accent: '#93c5fd',
    accentSoft: '#1e3a5f',
    warning: '#f87171',
    shadow: '#06100d',
    prop: '#3f4f2e',
    metal: '#9ca3af',
  },
  {
    stage: 4,
    name: '女巫沼泽',
    floor: '#142617',
    floorAlt: '#20351d',
    floorDark: '#071007',
    floorLine: '#567d35',
    accent: '#a3e635',
    accentSoft: '#3f6212',
    warning: '#c084fc',
    shadow: '#050d05',
    prop: '#4d3a2c',
    metal: '#87946c',
  },
  {
    stage: 5,
    name: '兽人战争营地',
    floor: '#2b2118',
    floorAlt: '#3a2a1c',
    floorDark: '#110c08',
    floorLine: '#8a552c',
    accent: '#f97316',
    accentSoft: '#7c2d12',
    warning: '#ef4444',
    shadow: '#090604',
    prop: '#6b4423',
    metal: '#9ca3af',
  },
  {
    stage: 6,
    name: '精灵失落圣林',
    floor: '#13251b',
    floorAlt: '#203b26',
    floorDark: '#07110b',
    floorLine: '#6f9c4d',
    accent: '#fef3c7',
    accentSoft: '#3f6212',
    warning: '#bef264',
    shadow: '#06100a',
    prop: '#4f6f3c',
    metal: '#d8c8aa',
  },
  {
    stage: 7,
    name: '巨魔与地精矿坑',
    floor: '#211d18',
    floorAlt: '#302a21',
    floorDark: '#0d0b08',
    floorLine: '#a16207',
    accent: '#fbbf24',
    accentSoft: '#78350f',
    warning: '#fb923c',
    shadow: '#080604',
    prop: '#5b3416',
    metal: '#94a3b8',
  },
  {
    stage: 8,
    name: '鱼人潮汐神殿',
    floor: '#102129',
    floorAlt: '#173442',
    floorDark: '#061016',
    floorLine: '#0891b2',
    accent: '#67e8f9',
    accentSoft: '#0e7490',
    warning: '#38bdf8',
    shadow: '#040b0f',
    prop: '#2f5d66',
    metal: '#cbd5e1',
  },
  {
    stage: 9,
    name: '牛头人迷宫',
    floor: '#241d17',
    floorAlt: '#33271d',
    floorDark: '#100b07',
    floorLine: '#b45309',
    accent: '#d8a24d',
    accentSoft: '#7c2d12',
    warning: '#dc2626',
    shadow: '#090604',
    prop: '#6b4423',
    metal: '#d1d5db',
  },
  {
    stage: 10,
    name: '巨龙审判火山',
    floor: '#1f1110',
    floorAlt: '#351515',
    floorDark: '#0b0504',
    floorLine: '#c2410c',
    accent: '#fbbf24',
    accentSoft: '#7c2d12',
    warning: '#f97316',
    shadow: '#050202',
    prop: '#431407',
    metal: '#fef3c7',
  },
]

export const getCampaignStage = (level: number) => {
  const safeLevel = Math.max(1, Math.floor(level || 1))
  return Math.min(10, Math.floor((safeLevel - 1) / 22) + 1)
}

export const getCampaignThemeForLevel = (level: number) => {
  const stage = getCampaignStage(level)
  return CAMPAIGN_THEMES[stage - 1]
}

export const CAMPAIGN_THEME_NAMES = CAMPAIGN_THEMES.map((theme) => theme.name)
