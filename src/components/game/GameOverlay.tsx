import { useMemo, useState, type ReactNode } from 'react'
import { Coins, RotateCcw } from 'lucide-react'

import { ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE, ARCHER_FIXED_PASSIVE_LEVELS, SKILL_BUILD_DESCRIPTIONS, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { ACTIVE_SKILL_DAMAGE_MULTIPLIER } from '../../game/config'
import { WEAPON_DEFINITIONS } from '../../game/weapons'
import { useGameStore } from '../../store/useGameStore'

type VillageModal = 'shop' | 'guide' | 'character' | 'inventory' | 'settings' | 'hunter-home' | null

const formatScaledDamage = (damage: number) => {
  return Number((damage * ACTIVE_SKILL_DAMAGE_MULTIPLIER).toFixed(1))
}

const milestoneRewards = [
  { level: 10, reward: '挑战者称号' },
  { level: 20, reward: '绿色角色描边' },
  { level: 50, reward: '黄金箭矢外观' },
  { level: 100, reward: '永久角色皮肤' },
  { level: 200, reward: '永久武器皮肤' },
]

const monsterGuide = [
  {
    name: '腐绿近战史莱姆',
    appears: '第 1 层起',
    behavior: '缓慢贴近玩家，依靠接触造成伤害。',
    visual: '绿色软泥外观，适合用穿透箭线拉直处理。',
  },
  {
    name: '冰霜远程史莱姆',
    appears: '第 4 层起',
    behavior: '保持距离并发射寒冰弹，场上数量多时会限制走位。',
    visual: '蓝白冰霜体，远程攻击表现为寒冰弹而不是箭矢。',
  },
  {
    name: '猩红冲锋怪',
    appears: '第 3 层起',
    behavior: '进入距离后短暂蓄势并向玩家冲刺。',
    visual: '红色冲锋标记，留意冲刺前的爆发提示。',
  },
  {
    name: '裂变软泥',
    appears: '第 7 层起',
    behavior: '死亡时会分裂出小型近战怪，适合用范围或陷阱处理。',
    visual: '黄绿色分裂体，体型越大越需要优先清掉。',
  },
  {
    name: '爆裂火囊怪',
    appears: '第 9 层起',
    behavior: '死亡时产生爆裂冲击，靠近击杀有风险。',
    visual: '橙色火囊外观，建议远距离点杀。',
  },
  {
    name: '精英变体',
    appears: '每 5 层',
    behavior: '更高生命与压迫力，击败后给强化奖励。',
    visual: '紫色精英轮廓，通常需要保留主动技能应对。',
  },
  {
    name: '地牢小 Boss',
    appears: '每 10 层',
    behavior: '兼具冲锋与扇形远程火焰弹，战斗节奏更强。',
    visual: '橙色大型敌人，远程攻击表现为火焰弹幕。',
  },
]

const OverlayCard = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  icon: ReactNode
}) => {
  return (
    <div className="pointer-events-auto pixel-panel mx-4 max-w-md p-6 text-center">
      <div className="mb-4 inline-flex border-2 border-[#08100b] bg-[#121b16] p-3 text-amber-300 shadow-[0_0_0_2px_rgba(157,213,172,0.12)]">
        {icon}
      </div>
      <h3 className="font-pixel text-sm uppercase tracking-[0.2em] text-[#f4f0d7] md:text-base">{title}</h3>
      <p className="mx-auto mt-4 max-w-xs text-xl text-[#dfe7d5]">{description}</p>
      <button className="pixel-button mt-6 px-5 py-3 font-pixel text-[10px] uppercase tracking-[0.18em]" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}

const SectionPanel = ({
  eyebrow,
  title,
  children,
  actions,
  contentClassName,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  actions?: ReactNode
  contentClassName?: string
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col border-2 border-[#08100b] bg-[#111913] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.1)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[10px]">{eyebrow}</p>
          <h3 className="mt-2 font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base">{title}</h3>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className={contentClassName ? `mt-4 ${contentClassName}` : 'mt-4'}>{children}</div>
    </div>
  )
}

const WeaponShopPanel = ({
  currency,
  bestLevel,
  unlockedWeapons,
  equippedWeaponId,
  purchaseWeapon,
  equipWeapon,
}: {
  currency: number
  bestLevel: number
  unlockedWeapons: string[]
  equippedWeaponId: string | null
  purchaseWeapon: (weaponId: (typeof WEAPON_DEFINITIONS)[number]['id']) => void
  equipWeapon: (weaponId: (typeof WEAPON_DEFINITIONS)[number]['id']) => void
}) => {
  const progress = Math.min(100, Math.round((bestLevel / 10) * 100))

  return (
    <SectionPanel eyebrow="武器商店" title="10 把成长型弓系武器">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-xl text-[#dfe7d5]">
          <p>当前金币：{currency}</p>
          <p>历史最高层：{bestLevel}</p>
        </div>
        <div className="text-right">
          <p className="font-pixel text-[8px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[9px]">当前装备</p>
          <p className="mt-1 font-pixel text-[10px] uppercase tracking-[0.12em] text-[#f4f0d7]">
            {equippedWeaponId ? WEAPON_DEFINITIONS.find((weapon) => weapon.id === equippedWeaponId)?.name : '默认猎弓'}
          </p>
          <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.16em] text-amber-300 md:text-[9px]">解锁进度 {progress}%</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {WEAPON_DEFINITIONS.map((weapon) => {
          const unlockedByProgress = progress >= Math.round(weapon.unlockProgress * 100)
          const owned = unlockedWeapons.includes(weapon.id)
          const equipped = equippedWeaponId === weapon.id
          const canBuy = unlockedByProgress && !owned && currency >= weapon.price

          return (
            <div key={weapon.id} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">{weapon.name}</p>
                  <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{weapon.description}</p>
                </div>
                <span className="font-pixel text-[8px] uppercase tracking-[0.16em] text-amber-300">{weapon.price}G</span>
              </div>

              <div className="mt-3 space-y-1 text-[1rem] leading-tight text-[#9dd5ac]">
                {weapon.bonus.attackDamage ? <p>伤害 +{weapon.bonus.attackDamage}</p> : null}
                {weapon.bonus.attackRange ? <p>射程 +{weapon.bonus.attackRange}</p> : null}
                {weapon.bonus.speed ? <p>移速 +{weapon.bonus.speed}</p> : null}
                {weapon.bonus.attackPierce ? <p>穿透 +{weapon.bonus.attackPierce}</p> : null}
                {weapon.bonus.attackIntervalOffset ? <p>攻速 {weapon.bonus.attackIntervalOffset.toFixed(2)}s</p> : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="font-pixel text-[8px] uppercase tracking-[0.16em] text-[#9dd5ac] md:text-[9px]">
                  解锁要求 {Math.round(weapon.unlockProgress * 100)}%
                </p>
                {equipped ? (
                  <span className="font-pixel text-[8px] uppercase tracking-[0.16em] text-amber-300 md:text-[9px]">已装备</span>
                ) : owned ? (
                  <button
                    className="pixel-button px-3 py-2 font-pixel text-[10px] uppercase tracking-[0.16em]"
                    onClick={() => equipWeapon(weapon.id)}
                  >
                    装备
                  </button>
                ) : (
                  <button
                    className="pixel-button px-3 py-2 font-pixel text-[10px] uppercase tracking-[0.16em] disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    onClick={() => purchaseWeapon(weapon.id)}
                    disabled={!canBuy}
                  >
                    {unlockedByProgress ? '购买' : '未解锁'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </SectionPanel>
  )
}

const VillageClickArea = ({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className: string
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`pointer-events-auto absolute bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08100b] ${className}`}
    onClick={onClick}
  />
)

const VillageModalShell = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(3,8,6,0.68)] p-4">
    <div className="pointer-events-auto pixel-panel max-h-[92vh] w-[min(94vw,1280px)] overflow-y-auto p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-pixel text-[9px] uppercase tracking-[0.2em] text-[#9dd5ac] md:text-[10px]">村庄交互</p>
          <h2 className="mt-2 font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base">{title}</h2>
        </div>
        <button type="button" className="pixel-button px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.16em]" onClick={onClose}>
          关闭
        </button>
      </div>
      {children}
    </div>
  </div>
)

export function GameOverlay() {
  const phase = useGameStore((state) => state.phase)
  const level = useGameStore((state) => state.level)
  const levelTargetKills = useGameStore((state) => state.levelTargetKills)
  const levelTimer = useGameStore((state) => state.levelTimer)
  const message = useGameStore((state) => state.message)
  const kills = useGameStore((state) => state.kills)
  const currency = useGameStore((state) => state.currency)
  const earnedGold = useGameStore((state) => state.earnedGold)
  const bestLevel = useGameStore((state) => state.bestLevel)
  const runHistory = useGameStore((state) => state.runHistory)
  const achievedMilestones = useGameStore((state) => state.achievedMilestones)
  const unlockedWeapons = useGameStore((state) => state.unlockedWeapons)
  const equippedWeaponId = useGameStore((state) => state.equippedWeaponId)
  const activeSkills = useGameStore((state) => state.activeSkills)
  const skillAllocations = useGameStore((state) => state.skillAllocations)
  const startGame = useGameStore((state) => state.startGame)
  const returnToVillage = useGameStore((state) => state.returnToVillage)
  const purchaseWeapon = useGameStore((state) => state.purchaseWeapon)
  const equipWeapon = useGameStore((state) => state.equipWeapon)
  const [villageModal, setVillageModal] = useState<VillageModal>(null)
  const [masterVolume, setMasterVolume] = useState(80)
  const [effectVolume, setEffectVolume] = useState(75)
  const [moveKeys, setMoveKeys] = useState('WASD')
  const skillSections = useMemo(() => {
    return [
      { buildTag: 'pierce' as const, label: SKILL_BUILD_LABELS.pierce, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'pierce') },
      { buildTag: 'spread' as const, label: SKILL_BUILD_LABELS.spread, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'spread') },
      { buildTag: 'control' as const, label: SKILL_BUILD_LABELS.control, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'control') },
      { buildTag: 'beast' as const, label: SKILL_BUILD_LABELS.beast, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'beast') },
    ]
  }, [])

  if (phase === 'idle') {
    const equippedWeaponName = equippedWeaponId ? WEAPON_DEFINITIONS.find((weapon) => weapon.id === equippedWeaponId)?.name : '默认猎弓'
    const ownedWeapons = WEAPON_DEFINITIONS.filter((weapon) => unlockedWeapons.includes(weapon.id))
    const currentSkillNames = activeSkills.map((skill) => ARCHER_ACTIVE_SKILLS.find((definition) => definition.id === skill.skillId)?.name ?? skill.skillId)

    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-1/2 top-1/2 aspect-[3/2] h-auto max-h-screen w-full max-w-[calc(100vh*1.5)] -translate-x-1/2 -translate-y-1/2">
          <VillageClickArea label="开始游戏" className="z-20 left-[2%] top-[55%] h-[7%] w-[15%]" onClick={startGame} />
          <VillageClickArea label="角色选择" className="z-20 left-[2%] top-[63%] h-[7%] w-[15%]" onClick={() => setVillageModal('character')} />
          <VillageClickArea label="物品仓库" className="z-20 left-[2%] top-[71%] h-[7%] w-[15%]" onClick={() => setVillageModal('inventory')} />
          <VillageClickArea label="设置" className="z-20 left-[2%] top-[79%] h-[7%] w-[15%]" onClick={() => setVillageModal('settings')} />
          <VillageClickArea label="铁匠铺" className="z-10 left-[4%] top-[31%] h-[36%] w-[25%]" onClick={() => setVillageModal('shop')} />
          <VillageClickArea label="猎人之家" className="z-10 left-[34%] top-[27%] h-[30%] w-[27%]" onClick={() => setVillageModal('hunter-home')} />
          <VillageClickArea label="传送门" className="z-10 left-[64%] top-[32%] h-[35%] w-[16%]" onClick={startGame} />
          <VillageClickArea label="告示牌" className="z-10 left-[79%] top-[45%] h-[33%] w-[18%]" onClick={() => setVillageModal('guide')} />
        </div>

        {villageModal === 'character' ? (
          <VillageModalShell title="角色选择" onClose={() => setVillageModal(null)}>
            <div className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
              <SectionPanel eyebrow="可用职业" title="弓箭手">
                <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                  <p className="font-pixel text-[10px] text-amber-300">已解锁 / 当前可玩</p>
                  <p className="mt-3 text-xl text-[#dfe7d5]">远程拉扯、穿透箭线、散射压制、野兽伙伴。</p>
                  <p className="mt-3 font-pixel text-[9px] text-[#9dd5ac]">其他职业：未开放</p>
                </div>
              </SectionPanel>
              <SectionPanel eyebrow="职业档案" title="当前职业：弓箭手">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[9px] text-[#f4f0d7]">固定被动</p>
                    <p className="mt-2 text-xl text-[#9dd5ac]">{ARCHER_FIXED_PASSIVE.name}</p>
                    <p className="mt-2 text-lg text-[#dfe7d5]">{ARCHER_FIXED_PASSIVE.description}</p>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[9px] text-[#f4f0d7]">初始技能</p>
                    <p className="mt-2 text-lg text-[#dfe7d5]">{currentSkillNames.join(' / ')}</p>
                    <button className="pixel-button mt-5 px-4 py-3 font-pixel text-[10px]" onClick={startGame}>使用弓箭手开始</button>
                  </div>
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}

        {villageModal === 'inventory' ? (
          <VillageModalShell title="物品仓库" onClose={() => setVillageModal(null)}>
            <SectionPanel eyebrow="已购买武器" title={`${ownedWeapons.length} / ${WEAPON_DEFINITIONS.length}`}>
              {ownedWeapons.length === 0 ? (
                <p className="text-xl text-[#dfe7d5]">还没有购买武器。前往铁匠铺可使用金币购买装备。</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {ownedWeapons.map((weapon) => (
                    <div key={weapon.id} className="border-2 border-[#08100b] bg-[#121b16] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-pixel text-[10px] text-[#f4f0d7]">{weapon.name}</p>
                          <p className="mt-2 text-lg text-[#dfe7d5]">{weapon.description}</p>
                        </div>
                        <span className="font-pixel text-[8px] text-amber-300">{equippedWeaponId === weapon.id ? '已装备' : `${weapon.price}G`}</span>
                      </div>
                      {equippedWeaponId !== weapon.id ? (
                        <button className="pixel-button mt-4 px-4 py-3 font-pixel text-[10px]" onClick={() => equipWeapon(weapon.id)}>装备</button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </SectionPanel>
          </VillageModalShell>
        ) : null}

        {villageModal === 'settings' ? (
          <VillageModalShell title="设置" onClose={() => setVillageModal(null)}>
            <div className="grid gap-4 md:grid-cols-2">
              <SectionPanel eyebrow="音量" title="声音设置">
                <label className="block text-xl text-[#dfe7d5]">
                  主音量 {masterVolume}%
                  <input className="mt-3 w-full accent-amber-300" type="range" min={0} max={100} value={masterVolume} onChange={(event) => setMasterVolume(Number(event.target.value))} />
                </label>
                <label className="mt-5 block text-xl text-[#dfe7d5]">
                  音效 {effectVolume}%
                  <input className="mt-3 w-full accent-amber-300" type="range" min={0} max={100} value={effectVolume} onChange={(event) => setEffectVolume(Number(event.target.value))} />
                </label>
              </SectionPanel>
              <SectionPanel eyebrow="按键" title="操作方案">
                <div className="grid gap-3">
                  {['WASD', '方向键'].map((option) => (
                    <button
                      key={option}
                      className={`border-2 border-[#08100b] px-4 py-3 text-left font-pixel text-[10px] ${moveKeys === option ? 'bg-amber-300 text-[#08100b]' : 'bg-[#121b16] text-[#f4f0d7]'}`}
                      onClick={() => setMoveKeys(option)}
                    >
                      移动：{option}
                    </button>
                  ))}
                  <p className="text-xl text-[#dfe7d5]">技能：Q / E / R，闪避：Space，暂停：Esc，目标切换：Tab。</p>
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}

        {villageModal === 'hunter-home' ? (
          <VillageModalShell title="猎人之家" onClose={() => setVillageModal(null)}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <SectionPanel eyebrow="当前猎人" title="弓箭手">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[8px] text-[#9dd5ac]">最高层</p>
                    <p className="mt-3 font-pixel text-sm text-amber-300">{bestLevel}</p>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[8px] text-[#9dd5ac]">当前装备</p>
                    <p className="mt-3 font-pixel text-[10px] text-amber-300">{equippedWeaponName}</p>
                  </div>
                </div>
                <p className="mt-4 text-xl text-[#dfe7d5]">
                  当前成长：生命 {skillAllocations.vitality} / 力量 {skillAllocations.power} / 急速 {skillAllocations.haste} / 灵巧 {skillAllocations.agility}
                </p>
              </SectionPanel>
              <SectionPanel eyebrow="通关记录" title="历史冒险">
                <div className="grid gap-3 md:grid-cols-2">
                  {runHistory.length === 0 ? (
                    <p className="text-xl text-[#dfe7d5]">暂无记录。完成一次冒险后会显示层数与所用技能。</p>
                  ) : (
                    runHistory.map((record, index) => (
                      <div key={record.id} className="border-2 border-[#08100b] bg-[#121b16] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-pixel text-[10px] text-amber-300">#{index + 1}</p>
                          <p className="font-pixel text-[9px] text-[#f4f0d7]">第 {record.level} 层</p>
                        </div>
                        <p className="mt-2 text-lg text-[#dfe7d5]">击杀 {record.kills} / 金币 {record.gold}</p>
                        <p className="mt-2 text-lg text-[#9dd5ac]">技能：{record.activeSkillNames?.join(' / ') || '默认弓术'}</p>
                        <p className="mt-1 text-lg text-[#9dd5ac]">{record.statSummary || '属性记录：旧版本未记录'}</p>
                      </div>
                    ))
                  )}
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}

        {villageModal === 'shop' ? (
          <VillageModalShell title="铁匠铺老板" onClose={() => setVillageModal(null)}>
            <WeaponShopPanel
              currency={currency}
              bestLevel={bestLevel}
              unlockedWeapons={unlockedWeapons}
              equippedWeaponId={equippedWeaponId}
              purchaseWeapon={purchaseWeapon}
              equipWeapon={equipWeapon}
            />
          </VillageModalShell>
        ) : null}

        {villageModal === 'guide' ? (
          <VillageModalShell title="职业与技能告示牌" onClose={() => setVillageModal(null)}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <SectionPanel eyebrow="职业介绍" title="弓箭手">
                <div className="space-y-3 text-xl text-[#dfe7d5]">
                  <p>弓箭手是围绕走位、射程与 Q / E / R 主动技能槽构建的远程职业。</p>
                  <p>基础定位偏向拉扯输出，适合通过鼠标指向控制穿透箭线、散射扇面和野兽伙伴指令。</p>
                  <p>奖励会根据你已经选择的技能产生轻微流派倾向，连续选择同一方向后更容易形成完整构筑。</p>
                </div>
                <div className="mt-4 border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">固定被动</p>
                  <p className="mt-2 text-xl text-[#dfe7d5]">{ARCHER_FIXED_PASSIVE.name}</p>
                  <p className="mt-2 text-lg leading-tight text-[#9dd5ac]">{ARCHER_FIXED_PASSIVE.description}</p>
                  <div className="mt-4 space-y-2 text-[1rem] leading-tight text-[#dfe7d5]">
                    {ARCHER_FIXED_PASSIVE_LEVELS.map((passiveLevel) => (
                      <p key={passiveLevel.level}>Lv.{passiveLevel.level}：{passiveLevel.description}</p>
                    ))}
                  </div>
                </div>
              </SectionPanel>
              <SectionPanel eyebrow="怪物图鉴" title={`已知敌人 ${monsterGuide.length} 种`} contentClassName="max-h-[58vh] overflow-y-auto pr-1">
                <div className="grid gap-3 md:grid-cols-2">
                  {monsterGuide.map((monster) => (
                    <div key={monster.name} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#f4f0d7] md:text-[10px]">{monster.name}</p>
                        <span className="shrink-0 border border-[rgba(246,200,111,0.35)] px-2 py-1 font-pixel text-[7px] text-amber-300">{monster.appears}</span>
                      </div>
                      <p className="mt-3 text-lg leading-tight text-[#dfe7d5]">{monster.behavior}</p>
                      <p className="mt-2 text-[1rem] leading-tight text-[#9dd5ac]">{monster.visual}</p>
                    </div>
                  ))}
                </div>
              </SectionPanel>

              <SectionPanel eyebrow="技能介绍" title={`弓箭手技能池 ${ARCHER_ACTIVE_SKILLS.length} 项`} contentClassName="max-h-[58vh] overflow-y-auto pr-1">
                <div className="space-y-4">
                  {skillSections.map((section) => (
                    <div key={section.label}>
                      <p className="mb-3 font-pixel text-[9px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[10px]">{section.label}</p>
                      <p className="mb-3 text-lg leading-tight text-[#dfe7d5]">{SKILL_BUILD_DESCRIPTIONS[section.buildTag]}</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {section.items.map((skill) => (
                          <div key={skill.id} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                            <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">{skill.name}</p>
                            <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{skill.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {skill.tacticalTags.map((tag) => (
                                <span key={tag} className="border border-[rgba(157,213,172,0.22)] bg-[rgba(8,16,11,0.5)] px-2 py-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-[#9dd5ac]">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="mt-3 space-y-1 text-[1rem] leading-tight text-[#9dd5ac]">
                              <p>流派：{SKILL_BUILD_LABELS[skill.buildTag]}</p>
                              <p>Lv.1 伤害：{formatScaledDamage(skill.levels[0].damage)}</p>
                              <p>Lv.5 伤害：{formatScaledDamage(skill.levels[4].damage)}</p>
                              <p>冷却：{skill.levels[0].cooldown}s 到 {skill.levels[4].cooldown}s</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}
      </div>
    )
  }

  if (phase === 'game-over') {
    const nextMilestone = milestoneRewards.find((milestone) => !achievedMilestones.includes(milestone.level))

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(8,16,11,0.62)]">
        <div className="pointer-events-auto pixel-panel mx-4 w-full max-w-[1180px] p-5 md:p-6">
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <OverlayCard
                title="冒险结束"
                description={`你闯到第 ${level} 层，累计击败 ${kills} 只敌人。`}
                actionLabel="回到村庄"
                onAction={returnToVillage}
                icon={<RotateCcw size={24} />}
              />
              <div className="border-2 border-[#08100b] bg-[#111913] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.1)]">
                <div className="flex items-center gap-3 text-amber-300">
                  <Coins size={18} />
                  <p className="font-pixel text-[10px] uppercase tracking-[0.18em]">对局结算</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xl text-[#dfe7d5]">
                  <p>到达层数：{level}</p>
                  <p>击杀数量：{kills}</p>
                  <p>本局奖励：{earnedGold} 金币</p>
                  <p>当前金币：{currency}</p>
                </div>
                <p className="mt-3 text-lg text-[#9dd5ac]">
                  {nextMilestone
                    ? `距离 ${nextMilestone.level} 层奖励「${nextMilestone.reward}」还差 ${Math.max(0, nextMilestone.level - level)} 层`
                    : '所有长期目标已经达成，继续刷新你的最高层数'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionPanel eyebrow="历史排行" title={`最高层：${bestLevel}`}>
                <div className="space-y-3">
                  {runHistory.length === 0 ? (
                    <p className="text-xl text-[#dfe7d5]">完成一局后会记录你的前 5 名成绩。</p>
                  ) : (
                    runHistory.map((record, index) => (
                      <div key={record.id} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-pixel text-[10px] uppercase tracking-[0.16em] text-amber-300">#{index + 1}</p>
                          <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#f4f0d7]">第 {record.level} 层</p>
                        </div>
                        <p className="mt-2 text-lg text-[#dfe7d5]">击杀 {record.kills} / 金币 {record.gold}</p>
                      </div>
                    ))
                  )}
                </div>
              </SectionPanel>

              <SectionPanel eyebrow="长期目标" title="爬塔奖励">
                <div className="space-y-3">
                  {milestoneRewards.map((milestone) => {
                    const achieved = achievedMilestones.includes(milestone.level) || bestLevel >= milestone.level

                    return (
                      <div key={milestone.level} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#f4f0d7]">通关 {milestone.level} 层</p>
                          <p className={`font-pixel text-[8px] uppercase tracking-[0.16em] ${achieved ? 'text-amber-300' : 'text-[#9dd5ac]'}`}>
                            {achieved ? '已达成' : '未达成'}
                          </p>
                        </div>
                        <p className="mt-2 text-lg text-[#dfe7d5]">{milestone.reward}</p>
                      </div>
                    )
                  })}
                </div>
              </SectionPanel>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'paused') {
    return null
  }

  if (phase === 'running' && levelTimer > 0) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="border-2 border-[#08100b] bg-[rgba(8,16,11,0.72)] px-6 py-5 text-center shadow-[0_0_0_2px_rgba(157,213,172,0.16)]">
          <p className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-xs">地牢入场</p>
          <p className="mt-3 font-pixel text-sm uppercase tracking-[0.14em] text-[#f4f0d7] md:text-lg">第 {level} 层</p>
          <p className="mt-3 text-xl leading-tight text-[#dfe7d5] md:text-2xl">{message}</p>
          <p className="mt-3 font-pixel text-[9px] uppercase tracking-[0.16em] text-amber-300 md:text-[10px]">准备 {Math.ceil(levelTimer * 10) / 10}s</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute left-4 top-20 border-2 border-[#08100b] bg-[rgba(8,16,11,0.68)] px-3 py-2 shadow-[0_0_0_2px_rgba(157,213,172,0.08)] md:top-[76px]">
      <p className="font-pixel text-[9px] uppercase tracking-[0.12em] text-[#f4f0d7] md:text-[10px]">
        {level}层 / 目标{levelTargetKills}
      </p>
    </div>
  )
}
