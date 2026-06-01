import { useMemo, useState, type ReactNode } from 'react'
import { Coins, RotateCcw } from 'lucide-react'

import { ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE, ARCHER_FIXED_PASSIVE_LEVELS } from '../../game/archerSkills'
import { WEAPON_DEFINITIONS } from '../../game/weapons'
import { useGameStore } from '../../store/useGameStore'

type IdleMenuTab = 'start' | 'shop' | 'profession' | 'skills'

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

const MenuButton = ({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) => {
  return (
    <button
      type="button"
      className={`w-full border-2 px-3 py-3 text-left font-pixel text-[10px] uppercase tracking-[0.16em] transition ${
        active
          ? 'border-amber-300 bg-[rgba(249,115,22,0.18)] text-[#f4f0d7] shadow-[0_0_0_2px_rgba(249,115,22,0.18)]'
          : 'border-[#08100b] bg-[#121b16] text-[#9dd5ac] shadow-[0_0_0_2px_rgba(157,213,172,0.08)]'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
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

export function GameOverlay() {
  const phase = useGameStore((state) => state.phase)
  const level = useGameStore((state) => state.level)
  const kills = useGameStore((state) => state.kills)
  const message = useGameStore((state) => state.message)
  const currency = useGameStore((state) => state.currency)
  const earnedGold = useGameStore((state) => state.earnedGold)
  const bestLevel = useGameStore((state) => state.bestLevel)
  const unlockedWeapons = useGameStore((state) => state.unlockedWeapons)
  const equippedWeaponId = useGameStore((state) => state.equippedWeaponId)
  const startGame = useGameStore((state) => state.startGame)
  const restart = useGameStore((state) => state.restart)
  const purchaseWeapon = useGameStore((state) => state.purchaseWeapon)
  const equipWeapon = useGameStore((state) => state.equipWeapon)
  const [idleTab, setIdleTab] = useState<IdleMenuTab>('start')
  const skillSections = useMemo(() => {
    return [
      { label: '弹道', items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.kind === 'projectile' || skill.kind === 'beam') },
      { label: '散射', items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.kind === 'spread' || skill.kind === 'orbit') },
      { label: '区域', items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.kind === 'rain' || skill.kind === 'storm' || skill.kind === 'trap' || skill.kind === 'turret') },
    ]
  }, [])

  if (phase === 'idle') {
    const backToStartButton =
      idleTab !== 'start' ? (
        <button
          type="button"
          className="pixel-button px-3 py-2 font-pixel text-[10px] uppercase tracking-[0.16em]"
          onClick={() => setIdleTab('start')}
        >
          返回主菜单
        </button>
      ) : null

    const renderIdleContent = () => {
      if (idleTab === 'shop') {
        return (
          <WeaponShopPanel
            currency={currency}
            bestLevel={bestLevel}
            unlockedWeapons={unlockedWeapons}
            equippedWeaponId={equippedWeaponId}
            purchaseWeapon={purchaseWeapon}
            equipWeapon={equipWeapon}
          />
        )
      }

      if (idleTab === 'profession') {
        return (
          <SectionPanel eyebrow="职业介绍" title="弓箭手" actions={backToStartButton}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-3 text-xl text-[#dfe7d5]">
                <p>弓箭手是围绕走位、射程与自动技能释放构建的远程职业。</p>
                <p>基础定位偏向拉扯输出，适合通过鼠标指向控制技能覆盖区域。</p>
                <p>局内固定被动不可替换，主动技能最多携带 3 个，并会自动朝鼠标方向施放。</p>
              </div>
              <div className="border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">固定被动</p>
                <p className="mt-2 text-xl text-[#dfe7d5]">{ARCHER_FIXED_PASSIVE.name}</p>
                <p className="mt-2 text-lg leading-tight text-[#9dd5ac]">{ARCHER_FIXED_PASSIVE.description}</p>
                <div className="mt-4 space-y-2 text-[1rem] leading-tight text-[#dfe7d5]">
                  {ARCHER_FIXED_PASSIVE_LEVELS.map((level) => (
                    <p key={level.level}>Lv.{level.level}：{level.description}</p>
                  ))}
                </div>
              </div>
            </div>
          </SectionPanel>
        )
      }

      if (idleTab === 'skills') {
        return (
          <SectionPanel
            eyebrow="技能介绍"
            title={`弓箭手技能池 ${ARCHER_ACTIVE_SKILLS.length} 项`}
            actions={backToStartButton}
            contentClassName="min-h-0 flex-1 overflow-y-auto pr-1"
          >
            <div className="space-y-4">
              {skillSections.map((section) => (
                <div key={section.label}>
                  <p className="mb-3 font-pixel text-[9px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[10px]">{section.label}</p>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {section.items.map((skill) => (
                      <div key={skill.id} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                        <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">{skill.name}</p>
                        <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{skill.description}</p>
                        <div className="mt-3 space-y-1 text-[1rem] leading-tight text-[#9dd5ac]">
                          <p>类型：{skill.kind}</p>
                          <p>Lv.1 伤害：{skill.levels[0].damage}</p>
                          <p>Lv.5 伤害：{skill.levels[4].damage}</p>
                          <p>冷却：{skill.levels[0].cooldown}s 到 {skill.levels[4].cooldown}s</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionPanel>
        )
      }

      return (
        <SectionPanel eyebrow="开始游戏" title="像素地牢猎手">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-3 text-xl text-[#dfe7d5]">
              <p>进入地下城后，弓箭手会自动攻击并自动释放主动技能。</p>
              <p>使用 `WASD` 或方向键走位，鼠标决定主动技能方向，`Tab` 切换目标优先级，`Space` 滑步闪避。</p>
              <p>每层完成后可以分配属性点，并从职业技能池里进行三选一成长。</p>
            </div>
            <div className="flex flex-col justify-between gap-4 border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
              <div className="space-y-2 text-xl text-[#dfe7d5]">
                <p>当前金币：{currency}</p>
                <p>历史最高层：{bestLevel}</p>
                <p>已收集武器：{unlockedWeapons.length}/10</p>
              </div>
              <button className="pixel-button px-5 py-3 font-pixel text-[10px] uppercase tracking-[0.18em]" onClick={startGame}>
                开始游戏
              </button>
            </div>
          </div>
        </SectionPanel>
      )
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(8,16,11,0.74)] p-4">
        <div className="pointer-events-auto pixel-panel flex h-full max-h-[calc(100vh-2rem)] w-full max-w-[1220px] min-h-0 flex-col p-5 md:p-6">
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-3">
              <SectionPanel eyebrow="主菜单" title="地牢前厅">
                <div className="space-y-2">
                  <MenuButton active={idleTab === 'start'} label="开始游戏" onClick={() => setIdleTab('start')} />
                  <MenuButton active={idleTab === 'shop'} label="武器商店" onClick={() => setIdleTab('shop')} />
                  <MenuButton active={idleTab === 'profession'} label="职业介绍" onClick={() => setIdleTab('profession')} />
                  <MenuButton active={idleTab === 'skills'} label="技能介绍" onClick={() => setIdleTab('skills')} />
                </div>
              </SectionPanel>
            </div>
            <div className="min-h-0">{renderIdleContent()}</div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'game-over') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(8,16,11,0.62)]">
        <div className="pointer-events-auto pixel-panel mx-4 w-full max-w-[1180px] p-5 md:p-6">
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <OverlayCard
                title="冒险结束"
                description={`你闯到第 ${level} 层，累计击败 ${kills} 只敌人。`}
                actionLabel="重新开始"
                onAction={restart}
                icon={<RotateCcw size={24} />}
              />
              <div className="border-2 border-[#08100b] bg-[#111913] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.1)]">
                <div className="flex items-center gap-3 text-amber-300">
                  <Coins size={18} />
                  <p className="font-pixel text-[10px] uppercase tracking-[0.18em]">对局结算</p>
                </div>
                <div className="mt-4 space-y-2 text-xl text-[#dfe7d5]">
                  <p>本局奖励：{earnedGold} 金币</p>
                  <p>当前金币：{currency}</p>
                  <p>历史最高层：{bestLevel}</p>
                  <p>武器解锁进度：{Math.min(100, Math.round((bestLevel / 10) * 100))}%</p>
                </div>
                <p className="mt-3 text-lg text-[#9dd5ac]">{message}</p>
              </div>
            </div>

            <WeaponShopPanel
              currency={currency}
              bestLevel={bestLevel}
              unlockedWeapons={unlockedWeapons}
              equippedWeaponId={equippedWeaponId}
              purchaseWeapon={purchaseWeapon}
              equipWeapon={equipWeapon}
            />
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'paused') {
    return null
  }

  return (
    <div className="pointer-events-none absolute left-4 top-28 max-w-[78%] border-2 border-[#08100b] bg-[rgba(8,16,11,0.72)] px-3 py-2 shadow-[0_0_0_2px_rgba(157,213,172,0.12)] md:top-32">
      <p className="font-pixel text-[8px] uppercase tracking-[0.2em] text-[#9dd5ac] md:text-[9px]">
        {phase === 'level-clear' ? '层级完成' : '战斗状态'}
      </p>
      <p className="mt-2 text-lg text-[#f4f0d7] md:text-xl">{message}</p>
    </div>
  )
}
