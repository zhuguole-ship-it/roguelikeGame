/**
 * Read-only UI copy for A1's spiral-break flight contract.  The phrases here
 * describe lifecycle and confirmed impact semantics only; target selection,
 * hit budgets, and cooldown timing remain engine-owned.
 */
const SPIRAL_BREAK_COOLDOWN_COPY = '持续至时间或命中预算耗尽后开始CD。'

export const getSpiralBreakPresentationLabel = (skillId: string | undefined) => (
  skillId === 'spiral-break' || skillId === 'cross-cut' || skillId === 'blood-scent'
    ? '穿透直线 · 持续追击'
    : undefined
)

export const getSpiralBreakPresentationDescription = (skillId: string | undefined, fallback: string) => {
  if (skillId === 'spiral-break') {
    return `从施放方向离开的单支螺旋追击箭，在当前锁定敌人间连续衔接；${SPIRAL_BREAK_COOLDOWN_COPY}`
  }
  if (skillId === 'cross-cut') {
    return `两支反向旋向追击箭；同敌短时抵达合并为一次交叉切击 2x。${SPIRAL_BREAK_COOLDOWN_COPY}`
  }
  if (skillId === 'blood-scent') {
    return `同一前进螺旋追击箭；真实伤害斩杀优先、无斩杀立即正常追击。${SPIRAL_BREAK_COOLDOWN_COPY}`
  }
  return fallback
}

export const getSpiralBreakLevel5PresentationDescription = (skillId: string | undefined, fallback: string) => {
  if (skillId === 'cross-cut') {
    return `同敌短时同步抵达只合并为一次交叉切击 2x；${SPIRAL_BREAK_COOLDOWN_COPY}`
  }
  if (skillId === 'blood-scent') {
    return `每次转向都按真实伤害判定斩杀优先；无斩杀立即正常追击。${SPIRAL_BREAK_COOLDOWN_COPY}`
  }
  return fallback
}
