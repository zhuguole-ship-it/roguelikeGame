import { describe, expect, it } from 'vitest'

import {
  BOSS_COMBAT_TABLES,
  BOSS_PHASE_THRESHOLDS,
  BOSS_PHASE_TRANSITION_DURATION,
  getBossCombatTable,
  getBossGuardCap,
  getBossSkillCooldownMultiplier,
} from './bossStages'

describe('boss combat stage tables', () => {
  it('defines the documented three hp phases, transition duration, and guard caps for every campaign boss', () => {
    expect(BOSS_PHASE_TRANSITION_DURATION).toBe(1.5)
    expect(BOSS_PHASE_THRESHOLDS).toEqual({ 2: 0.7, 3: 0.35 })

    for (let campaign = 1; campaign <= 10; campaign += 1) {
      const table = getBossCombatTable(campaign)
      expect(table.campaign).toBe(campaign)
      expect(table.normalAttack).toMatchObject({
        cooldown: 2.2,
        windup: 0.55,
        hitFrame: 0.35,
        recovery: 0.45,
        damageMultiplier: 1,
      })
      expect(table.phases[1].hpRange).toEqual([1, 0.7])
      expect(table.phases[2].hpRange).toEqual([0.7, 0.35])
      expect(table.phases[3].hpRange).toEqual([0.35, 0])
      expect(table.phases[1].guardCap).toBe(2)
      expect(table.phases[2].guardCap).toBe(4)
      expect(table.phases[3].guardCap).toBe(6)
      expect(getBossGuardCap(1)).toBe(2)
      expect(getBossGuardCap(2)).toBe(4)
      expect(getBossGuardCap(3)).toBe(6)
      expect(table.phases[1].skills.length).toBeGreaterThan(0)
      expect(table.phases[2].skills.length).toBeGreaterThan(0)
      expect(table.phases[3].skills.some((skill) => skill.kind === 'finisher')).toBe(true)
      table.phases[3].skills
        .filter((skill) => skill.kind === 'finisher')
        .forEach((skill) => {
          expect(skill.warning).toBeGreaterThanOrEqual(1.2)
          expect(skill.safetyWindow).toBeTruthy()
        })
    }
  })

  it('routes all ten documented boss names to distinct combat tables', () => {
    expect(Object.values(BOSS_COMBAT_TABLES).map((table) => table.name)).toEqual([
      '地牢典狱长',
      '血宴伯爵',
      '黑月狼王',
      '三相女巫',
      '断牙战酋',
      '失落林冠女王',
      '地精巨械驾驶员',
      '沉潮祭司',
      '迷宫牛头王',
      '契约巨龙',
    ])
  })

  it('applies only documented difficulty pressure to boss skill cooldowns', () => {
    expect(getBossSkillCooldownMultiplier('normal')).toBe(1)
    expect(getBossSkillCooldownMultiplier('hard')).toBe(0.92)
    expect(getBossSkillCooldownMultiplier('hell')).toBe(0.88)
    expect(getBossSkillCooldownMultiplier('nightmare')).toBe(0.88)
  })
})
