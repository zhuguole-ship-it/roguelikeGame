import { useGameStore } from '../../store/useGameStore'
import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_FIXED_PASSIVE } from '../../game/archerSkills'
import { WEAPON_DEFINITION_MAP } from '../../game/weapons'

const BarItem = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="border-2 border-[#08100b] bg-[rgba(10,20,15,0.84)] px-3 py-2 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
      <p className="font-pixel text-[8px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[9px]">{label}</p>
      <p className="mt-1 font-pixel text-[9px] uppercase tracking-[0.12em] text-[#f4f0d7] md:text-[10px]">{value}</p>
    </div>
  )
}

export function GameStatusBar() {
  const phase = useGameStore((state) => state.phase)
  const hp = useGameStore((state) => state.player.hp)
  const maxHp = useGameStore((state) => state.player.maxHp)
  const speed = useGameStore((state) => state.player.speed)
  const attackDamage = useGameStore((state) => state.player.attackDamage)
  const attackInterval = useGameStore((state) => state.player.attackInterval)
  const targetPriority = useGameStore((state) => state.targetPriority)
  const allocations = useGameStore((state) => state.skillAllocations)
  const professionId = useGameStore((state) => state.professionId)
  const fixedPassiveLevel = useGameStore((state) => state.fixedPassiveLevel)
  const activeSkills = useGameStore((state) => state.activeSkills)
  const currency = useGameStore((state) => state.currency)
  const equippedWeaponId = useGameStore((state) => state.equippedWeaponId)

  if (phase === 'idle' || phase === 'game-over') {
    return null
  }

  const items = [
    { label: '职业', value: professionId === 'archer' ? '弓箭手' : professionId },
    { label: '金币', value: `${currency}G` },
    { label: '武器', value: equippedWeaponId ? WEAPON_DEFINITION_MAP[equippedWeaponId].name : '默认猎弓' },
    { label: '生命', value: `${hp}/${maxHp}` },
    { label: '生命等级', value: `LV.${allocations.vitality}/${maxHp}` },
    { label: '攻击', value: `LV.${allocations.power}/${attackDamage}` },
    { label: '攻速', value: `LV.${allocations.haste}/${attackInterval.toFixed(2)}s` },
    { label: '移速', value: `LV.${allocations.agility}/${speed}` },
    { label: '目标', value: targetPriority === 'melee' ? '近战优先' : '远程优先' },
    { label: '固定被动', value: `${ARCHER_FIXED_PASSIVE.name} Lv.${fixedPassiveLevel}` },
  ]

  return (
    <div className="absolute left-4 right-4 top-4 z-20">
      <div className="border-2 border-[#08100b] bg-[rgba(8,16,11,0.82)] px-4 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.12)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-pixel text-[8px] uppercase tracking-[0.22em] text-[#9dd5ac] md:text-[9px]">猎手状态</p>
          <p className="font-pixel text-[8px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[9px]">鼠标决定技能方向 / Tab 切换目标 / ESC 暂停</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-10">
          {items.map((item) => (
            <BarItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => {
            const skill = activeSkills[index]
            return (
              <BarItem
                key={index}
                label={`主动技能 ${index + 1}`}
                value={skill ? `${ARCHER_ACTIVE_SKILL_MAP[skill.skillId].name} Lv.${skill.level}` : '空槽'}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
