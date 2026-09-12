import { describe, expect, it } from 'vitest'

import {
  ARCHER_COMBAT_TALENT_V3_CHOICE_COUNT,
  ARCHER_FINITE_COMBAT_TALENTS_V3,
  ARCHER_FINITE_COMBAT_TALENT_V3_BY_ID,
  ARCHER_INFINITE_COMBAT_TALENTS_V3,
  acceptArcherCombatTalentV3Choice,
  createArcherCombatTalentV3RuntimeState,
  generateArcherCombatTalentV3Offer,
  getArcherCombatTalentV3PresentationSnapshot,
  getArcherCombatTalentV3ModifierSnapshot,
  getLegalArcherFiniteCombatTalentsV3,
  normalizeArcherCombatTalentV3RuntimeState,
} from './archerTalentSystemV3'

const accept = (
  state: ReturnType<typeof createArcherCombatTalentV3RuntimeState>,
  id: string,
  families: string[],
) => acceptArcherCombatTalentV3Choice({ ...state, lastOfferedCandidateIds: [id] }, id, families)

describe('archer talent system V3 runtime', () => {
  it('owns exactly 102 unique finite nodes and exposes the confirmed ST001 route entry', () => {
    expect(ARCHER_FINITE_COMBAT_TALENTS_V3).toHaveLength(102)
    expect(new Set(ARCHER_FINITE_COMBAT_TALENTS_V3.map((node) => node.id)).size).toBe(102)
    expect(ARCHER_FINITE_COMBAT_TALENT_V3_BY_ID.get('ST001')).toMatchObject({
      tier: 'entry',
      archetype: 'spread',
      implementationStatus: 'specified',
    })
    expect(ARCHER_FINITE_COMBAT_TALENTS_V3.filter((node) => node.implementationStatus === 'product-effect-pending')).toEqual([])
    expect(ARCHER_FINITE_COMBAT_TALENTS_V3.every((node) => node.effect.rankEffects.length === node.maxRank)).toBe(true)
    expect(ARCHER_FINITE_COMBAT_TALENTS_V3.filter((node) => node.id !== 'ST001').every((node) => (
      node.description !== `${node.name}，最高 ${node.maxRank} 级。`
      && node.effect.rankEffects.every((rankEffect, index) => rankEffect !== `${node.name} Lv.${index + 1}`)
    ))).toBe(true)
  })

  it('accepts ST001 only with its frozen compatible route and applies the spread damage entry', () => {
    const offered = {
      ...createArcherCombatTalentV3RuntimeState(),
      lastOfferedCandidateIds: ['ST001'],
      lastOfferedRouteByCandidateId: { ST001: 'spread-afterimage' as const },
    }
    const accepted = acceptArcherCombatTalentV3Choice(offered, 'ST001', ['afterimage-salvo'])
    expect(accepted.accepted).toBe(true)
    expect(accepted.state.main).toEqual({ archetype: 'spread', routeId: 'spread-afterimage' })
    expect(accepted.state.finitePointsByArchetype.spread).toBe(1)
    expect(accepted.state.pendingInfiniteInsertions).toEqual(['spread'])
    expect(getArcherCombatTalentV3ModifierSnapshot(accepted.state).damageBonusByArchetype.spread).toBeCloseTo(0.08, 8)

    const tampered = acceptArcherCombatTalentV3Choice({
      ...offered,
      lastOfferedRouteByCandidateId: { ST001: 'spread-turret' },
    }, 'ST001', ['afterimage-salvo'])
    expect(tampered.accepted).toBe(false)
  })

  it('requires a compatible skill, then locks main and secondary routes without a third route', () => {
    let state = createArcherCombatTalentV3RuntimeState()
    expect(getLegalArcherFiniteCombatTalentsV3(state, ['pierce-arrow']).some((node) => node.id === 'PT001')).toBe(true)
    expect(getLegalArcherFiniteCombatTalentsV3(state, ['pierce-arrow']).some((node) => node.id === 'ST001')).toBe(false)

    let result = accept(state, 'PT001', ['pierce-arrow', 'fan-burst', 'arrow-rain'])
    expect(result.accepted).toBe(true)
    state = result.state
    result = accept(state, 'PT101', ['pierce-arrow', 'fan-burst', 'arrow-rain'])
    expect(result.accepted).toBe(true)
    state = result.state
    expect(state.main).toEqual({ archetype: 'pierce', routeId: 'pierce-armor' })

    result = accept(state, 'BTB001', ['pierce-arrow', 'ring-volley', 'arrow-rain'])
    expect(result.accepted).toBe(true)
    state = result.state
    result = accept(state, 'BTB101', ['pierce-arrow', 'ring-volley', 'arrow-rain'])
    expect(result.accepted).toBe(true)
    state = result.state
    expect(state.secondary).toEqual({ archetype: 'beast', routeId: 'beast-coordination' })
    expect(getLegalArcherFiniteCombatTalentsV3(state, ['pierce-arrow', 'ring-volley', 'arrow-rain']).some((node) => node.id === 'AT001')).toBe(false)
  })

  it('queues one insertion for every archetype finite point and consumes it only when displayed', () => {
    const selected = accept(createArcherCombatTalentV3RuntimeState(), 'PT001', ['pierce-arrow'])
    expect(selected.accepted).toBe(true)
    expect(selected.state.pendingInfiniteInsertions).toEqual(['pierce'])

    const offer = generateArcherCombatTalentV3Offer(selected.state, ['pierce-arrow'], 1234)
    expect(offer.choices).toHaveLength(ARCHER_COMBAT_TALENT_V3_CHOICE_COUNT)
    expect(offer.choices.filter((choice) => choice.nodeKind === 'infinite')).toHaveLength(1)
    expect(offer.choices.find((choice) => choice.nodeKind === 'infinite')).toMatchObject({
      archetype: 'pierce',
      insertionArchetype: 'pierce',
    })
    expect(offer.state.pendingInfiniteInsertions).toEqual([])
  })

  it('defends stale choices, applies one-round cooldowns, and does not recursively queue infinite picks', () => {
    const stale = acceptArcherCombatTalentV3Choice(createArcherCombatTalentV3RuntimeState(), 'BT001', ['pierce-arrow'])
    expect(stale.accepted).toBe(false)

    const finite = accept(createArcherCombatTalentV3RuntimeState(), 'PT001', ['pierce-arrow'])
    expect(finite.accepted).toBe(true)
    const insertion = generateArcherCombatTalentV3Offer(finite.state, ['pierce-arrow'], 19)
    const infinite = insertion.choices.find((choice) => choice.nodeKind === 'infinite')!
    const accepted = acceptArcherCombatTalentV3Choice(insertion.state, infinite.id, ['pierce-arrow'])
    expect(accepted.accepted).toBe(true)
    expect(accepted.state.infiniteOfferCooldowns[infinite.id]).toBe(1)
    expect(accepted.state.pendingInfiniteInsertions).toEqual([])
  })

  it('offers route-specific infinite growth only for the locked compatible route', () => {
    const state = normalizeArcherCombatTalentV3RuntimeState({
      ...createArcherCombatTalentV3RuntimeState(),
      finiteRanks: { PT001: 1, PT101: 1 },
      main: { archetype: 'pierce', routeId: 'pierce-armor' },
      pendingInfiniteInsertions: ['pierce'],
    })
    const offeredRouteIds = new Set<string>()
    for (let seed = 1; seed <= 80; seed += 1) {
      const offer = generateArcherCombatTalentV3Offer(state, ['pierce-arrow'], seed)
      offer.choices
        .filter((choice) => choice.nodeKind === 'infinite' && choice.routeId)
        .forEach((choice) => offeredRouteIds.add(choice.routeId!))
    }
    expect(offeredRouteIds).toEqual(new Set(['pierce-armor']))
  })

  it('projects implemented finite and infinite ranks into one pure modifier snapshot', () => {
    const modifier = getArcherCombatTalentV3ModifierSnapshot({
      ...createArcherCombatTalentV3RuntimeState(),
      finiteRanks: { BT001: 3, BT002: 2, BT003: 1, PT001: 1, AT001: 2, BTB001: 3 },
      infiniteRanks: {
        'INF-COMMON-DAMAGE': 11,
        'INF-COMMON-AS': 10,
        'INF-PIERCE-DAMAGE': 2,
        'INF-CONTROL-DURATION': 3,
      },
    })
    expect(modifier.globalDamageBonus).toBeCloseTo(0.53, 8)
    expect(modifier.basicAttackRangeBonus).toBeCloseTo(0.12, 8)
    expect(modifier.basicAttackSpeedBonus).toBeCloseTo(0.36, 8)
    expect(modifier.moveSpeedBonus).toBeCloseTo(0.03, 8)
    expect(modifier.damageBonusByArchetype.pierce).toBeCloseTo(0.22, 8)
    expect(modifier.controlDurationBonus).toBeCloseTo(0.17, 8)
    expect(modifier.beastMaxHpBonus).toBeCloseTo(0.09, 8)
  })

  it('projects every numeric V3 common finite contract at its authoritative cap', () => {
    const modifier = getArcherCombatTalentV3ModifierSnapshot({
      ...createArcherCombatTalentV3RuntimeState(),
      finiteRanks: {
        BT001: 3, BT002: 3, BT003: 3, BT004: 3, BT005: 1,
        BT101: 3, BT102: 3, BT103: 3, BT111: 3, BT112: 1,
        BT113: 3, BT121: 3, BT122: 3,
      },
    })
    expect(modifier).toMatchObject({
      basicAttackRangeBonus: 0.12,
      basicProjectileSpeedBonus: 0.09,
      basicAttackSpeedBonus: 0.09,
      moveSpeedBonus: 0.09,
      moveCritChanceBonus: 0.08,
      steadyDamagePerStack: 0.02,
      battlefieldAwarenessActive: true,
      playerCritChanceBonus: 0.06,
      eliteBossCritChanceBonus: 0.03,
      longRangeDamageBonus: 0.12,
      pierceFollowupDamagePerTarget: 0.07,
      movingIncomingDamageMultiplier: 0.94,
      escapeSpeedBonus: 0.25,
      lowHpDodgeChance: 0.12,
      killAttackSpeedPerStack: 0.04,
      huntDamageBonus: 0.1,
    })
  })

  it('projects the implemented pierce, barrage, and beast route modifiers with their route growth', () => {
    const modifier = getArcherCombatTalentV3ModifierSnapshot({
      ...createArcherCombatTalentV3RuntimeState(),
      finiteRanks: {
        PT111: 3,
        PT112: 1,
        PT211: 3,
        PT212: 3,
        PT213: 1,
        PT214: 3,
        PT311: 1,
        PT121: 1,
        PT122: 3,
        PT123: 1,
        PT221: 3,
        PT222: 3,
        PT223: 1,
        PT224: 3,
        PT321: 1,
        ST101: 3,
        ST102: 1,
        ST201: 3,
        ST202: 3,
        ST203: 1,
        ST204: 1,
        ST301: 1,
        BTB101: 3,
        BTB111: 3,
        BTB112: 1,
        BTB201: 3,
        BTB212: 3,
        BTB214: 1,
      },
      infiniteRanks: {
        'INF-PT-DAMAGE': 1,
        'INF-PT-TURN': 2,
        'INF-PT-REVISIT': 2,
        'INF-PT-FINAL': 2,
        'INF-PT-SHOCK-RADIUS': 2,
        'INF-PT-UNITY-DAMAGE': 1,
        'INF-PA-RETURN': 3,
        'INF-PE-MARK': 2,
        'INF-PE-THRESHOLD': 2,
        'INF-PE-SOULFIRE': 1,
        'INF-PE-CHAIN': 2,
        'INF-SB-CLOSE': 1,
        'INF-SB-THRESHOLD': 2,
        'INF-SB-CHORUS': 2,
        'INF-SB-RAIN': 2,
        'INF-BC-SPEED': 2,
        'INF-BK-HP': 1,
        'INF-BK-ELITE': 2,
        'INF-BK-SYNERGY': 2,
      },
    })
    expect(modifier.damageBonusByRoute['pierce-trajectory']).toBeCloseTo(0.08, 8)
    expect(modifier.pierceTrajectoryTurnDamagePerStack).toBeCloseTo(0.09, 8)
    expect(modifier.pierceTrajectoryRevisitDamageBonus).toBeCloseTo(0.19, 8)
    expect(modifier.pierceTrajectoryPrioritizeUnhit).toBe(true)
    expect(modifier.pierceTrajectoryRangeSpeedBonus).toBeCloseTo(0.2, 8)
    expect(modifier.pierceTrajectoryFinalDamageBonus).toBeCloseTo(0.31, 8)
    expect(modifier.pierceTrajectoryShockRadius).toBe(144)
    expect(modifier.pierceTrajectoryUnityDamageMultiplier).toBeCloseTo(0.864, 8)
    expect(modifier.pierceArmorReturnDamageBonus).toBeCloseTo(0.06, 8)
    expect(modifier.pierceExecutionNormalThreshold).toBeCloseTo(0.09, 8)
    expect(modifier.pierceExecutionMarkChance).toBeCloseTo(0.24, 8)
    expect(modifier.pierceExecutionSoulFireDamageMultiplier).toBeCloseTo(1.296, 8)
    expect(modifier.pierceExecutionMarkedNormalThreshold).toBeCloseTo(0.12, 8)
    expect(modifier.pierceExecutionMarkedBossDamageBonus).toBeCloseTo(0.1, 8)
    expect(modifier.pierceExecutionSoulFireMarkChance).toBeCloseTo(0.55, 8)
    expect(modifier.pierceExecutionSoulFireChainEnabled).toBe(true)
    expect(modifier.pierceExecutionFullMarkDamageBonus).toBeCloseTo(0.12, 8)
    expect(modifier.pierceExecutionDeathChainDuration).toBeCloseTo(4.5, 8)
    expect(modifier.spreadBarrageCloseRangeDamageBonus).toBeCloseTo(0.17, 8)
    expect(modifier.spreadBarrageRangeChargeEnabled).toBe(true)
    expect(modifier.spreadBarrageSubsequentArrowDamagePerHit).toBeCloseTo(0.05, 8)
    expect(modifier.spreadBarrageFanAngleBonusDegrees).toBe(20)
    expect(modifier.spreadBarrageCloseCombatEnabled).toBe(true)
    expect(modifier.spreadBarrageRainDuration).toBeCloseTo(2.5, 8)
    expect(modifier.spreadBarrageChorusDamageMultiplier).toBeCloseTo(0.5, 8)
    expect(modifier.spreadBarrageDistinctTargetThresholdOffset).toBe(-2)
    expect(modifier.beastCoordinationAttackSpeedPerKind).toBeCloseTo(0.03, 8)
    expect(modifier.beastKingMaxHpBonus).toBeCloseTo(0.2, 8)
    expect(modifier.beastKingEliteBossDamageBonus).toBeCloseTo(0.22, 8)
    expect(modifier.beastKingCoordinationAttackSpeedBonus).toBeCloseTo(0.18, 8)
    expect(modifier.beastKingCoordinationIncomingDamageMultiplier).toBeCloseTo(0.9016, 8)
  })

  it('owns all 20 confirmed control-route infinite nodes and projects every cap into runtime values', () => {
    const expected = [
      ['INF-CB-DAMAGE', '无尽轰炸', 'control-bombardment', undefined],
      ['INF-CB-CENTER', '精准落点', 'control-bombardment', 10],
      ['INF-CB-RAIN', '暴雨增压', 'control-bombardment', 8],
      ['INF-CB-COOLDOWN', '连天调度', 'control-bombardment', 8],
      ['INF-CB-PURSUIT', '号令增幅', 'control-bombardment', 6],
      ['INF-CB-REQUIREMENT', '号令精简', 'control-bombardment', 1],
      ['INF-CT-DAMAGE', '无尽封锁', 'control-trap', undefined],
      ['INF-CT-RADIUS', '禁区扩张', 'control-trap', 10],
      ['INF-CT-DURATION', '深层束缚', 'control-trap', 12],
      ['INF-CT-CONTROLLED', '困兽加深', 'control-trap', 10],
      ['INF-CT-EXTENSION', '封锁扩时', 'control-trap', 8],
      ['INF-CT-ROOT-INTERVAL', '绝对禁锢', 'control-trap', 4],
      ['INF-CT-STRONG', '强敌压制', 'control-trap', 10],
      ['INF-CS-DAMAGE', '无尽风暴', 'control-storm', undefined],
      ['INF-CS-DURATION', '领域延展', 'control-storm', 10],
      ['INF-CS-CORE', '核心增压', 'control-storm', 7],
      ['INF-CS-RETARGET', '追踪涡流', 'control-storm', 6],
      ['INF-CS-OVERLAP', '重叠共振', 'control-storm', 10],
      ['INF-CS-ECHO', '残响增幅', 'control-storm', 6],
      ['INF-CS-PERMANENCE', '永续强化', 'control-storm', 5],
    ] as const
    const actual = ARCHER_INFINITE_COMBAT_TALENTS_V3.filter((node) => node.routeId?.startsWith('control-'))
    expect(actual.map(({ id, name, routeId, maxRank }) => [id, name, routeId, maxRank])).toEqual(expected)

    const infiniteRanks = Object.fromEntries(expected.map(([id, , , maxRank]) => [id, maxRank ?? 11]))
    const modifier = getArcherCombatTalentV3ModifierSnapshot({
      ...createArcherCombatTalentV3RuntimeState(),
      finiteRanks: {
        AT201: 3, AT202: 3, AT203: 3, AT301: 1,
        AT112: 3, AT211: 3, AT212: 3, AT214: 3, AT311: 1,
        AT221: 3, AT222: 3, AT223: 3, AT224: 1, AT321: 1,
      },
      infiniteRanks,
    })
    expect(modifier.damageBonusByRoute['control-bombardment']).toBeCloseTo(0.848, 8)
    expect(modifier.damageBonusByRoute['control-trap']).toBeCloseTo(0.848, 8)
    expect(modifier.damageBonusByRoute['control-storm']).toBeCloseTo(0.848, 8)
    expect(modifier).toMatchObject({
      controlBombardmentCenterDamageBonus: 0.36,
      controlBombardmentRainDamagePerStack: 0.16,
      controlBombardmentCooldownReduction: 0.2,
      controlBombardmentPursuitDamageMultiplier: 0.8,
      controlBombardmentPursuitRequiredCasts: 4,
      controlTrapRadiusBonus: 0.4,
      controlTrapDurationControlBonus: 0.28,
      controlTrapControlledDamageBonus: 0.34,
      controlTrapExtensionCap: 4,
      controlTrapTripleInterval: 2,
      controlTrapTripleEliteDamageBonus: 0.4,
      controlTrapTripleBossDamageBonus: 0.22,
      controlStormDurationBonus: 0.3,
      controlStormDamagePerStack: 0.14,
      controlStormRetargetEfficiencyBonus: 0.6,
      controlStormOverlapDamageBonus: 0.32,
      controlStormEchoDamageMultiplier: 0.6,
      controlStormEchoDuration: 3,
      controlStormOverlapExtensionPerSecond: 0.5,
      controlStormOverlapExtensionCap: 3.25,
    })
  })

  it('offers only the locked control route growth and removes capped nodes from legal presentation', () => {
    const state = normalizeArcherCombatTalentV3RuntimeState({
      ...createArcherCombatTalentV3RuntimeState(),
      finiteRanks: { AT001: 1, AT101: 1 },
      infiniteRanks: { 'INF-CB-REQUIREMENT': 99 },
      main: { archetype: 'control', routeId: 'control-bombardment' },
    })
    expect(state.infiniteRanks['INF-CB-REQUIREMENT']).toBe(1)
    const presentation = getArcherCombatTalentV3PresentationSnapshot(state, ['arrow-rain'])
    const routeNodes = presentation.infiniteCatalog.filter((node) => node.routeId?.startsWith('control-'))
    expect(routeNodes.filter((node) => node.status === 'available').every((node) => node.routeId === 'control-bombardment')).toBe(true)
    expect(routeNodes.find((node) => node.id === 'INF-CB-REQUIREMENT')?.status).toBe('maxed')
    expect(routeNodes.find((node) => node.id === 'INF-CT-DAMAGE')?.status).toBe('locked')
    expect(acceptArcherCombatTalentV3Choice({
      ...state,
      lastOfferedCandidateIds: ['INF-CB-REQUIREMENT'],
    }, 'INF-CB-REQUIREMENT', ['arrow-rain']).accepted).toBe(false)

    const offeredRouteIds = new Set<string>()
    for (let seed = 1; seed <= 80; seed += 1) {
      const offer = generateArcherCombatTalentV3Offer({
        ...state,
        pendingInfiniteInsertions: ['control'],
      }, ['arrow-rain'], seed)
      offer.choices
        .filter((choice) => choice.nodeKind === 'infinite' && choice.routeId)
        .forEach((choice) => offeredRouteIds.add(choice.routeId!))
    }
    expect(offeredRouteIds).toEqual(new Set(['control-bombardment']))
  })

  it('sanitizes save payloads and exposes a clone-safe readonly presentation snapshot', () => {
    const normalized = normalizeArcherCombatTalentV3RuntimeState({
      schemaVersion: 99,
      finiteRanks: { PT001: 99, unknown: 4 },
      infiniteRanks: { 'INF-COMMON-AS': 99, invalid: 1 },
      main: { archetype: 'spread', routeId: 'pierce-armor' },
      pendingInfiniteInsertions: ['pierce', 'invalid', 'beast'],
      finiteOfferCooldowns: { PT001: 2, unknown: 4 },
      infiniteOfferCooldowns: {},
      finiteFirstOfferBoosts: {},
      finitePointsByArchetype: { pierce: 2 },
      offerSequence: -3,
      lastOfferedCandidateIds: ['PT001', 'invalid'],
      phase: 'infinite',
      commonState: {
        continuousMoveSeconds: -1,
        nextBasicMoveCritArmed: true,
        steadySafeSeconds: 2.4,
        steadyStacks: 99,
        escapeSpeedRemaining: Number.NaN,
        escapeCooldownRemaining: 4,
        killAttackSpeedExpiresAt: [8, Number.NaN, 2, 6, 10],
        killTimes: [3, Number.NaN],
        huntDamageRemaining: -1,
        bossDamageProgress: { boss: 24, invalid: Number.NaN },
      },
    })
    expect(normalized.finiteRanks).toEqual({ PT001: 1 })
    expect(normalized.infiniteRanks).toEqual({ 'INF-COMMON-AS': 10 })
    expect(normalized.main).toBeUndefined()
    expect(normalized.pendingInfiniteInsertions).toEqual(['pierce', 'beast'])
    expect(normalized.offerSequence).toBe(0)
    expect(normalized.commonState).toEqual({
      continuousMoveSeconds: 0,
      nextBasicMoveCritArmed: true,
      steadySafeSeconds: 2.4,
      steadyStacks: 3,
      escapeSpeedRemaining: 0,
      escapeCooldownRemaining: 4,
      killAttackSpeedExpiresAt: [6, 8, 10],
      killTimes: [3],
      huntDamageRemaining: 0,
      bossDamageProgress: { boss: 24 },
    })

    const presentation = getArcherCombatTalentV3PresentationSnapshot(normalized, ['pierce-arrow'])
    expect(presentation.finiteCatalogCount).toBe(102)
    expect(presentation.pendingInfiniteInsertions).not.toBe(normalized.pendingInfiniteInsertions)
    expect(presentation.finiteCatalog).toHaveLength(102)
    expect(presentation.finiteCatalog.find((node) => node.id === 'ST001')).toMatchObject({
      status: 'locked',
      currentRank: 0,
    })
    expect(presentation.finiteCatalog.find((node) => node.id === 'PT001')?.status).toBe('maxed')
    expect(presentation.finiteCatalog.find((node) => node.id === 'PT101')?.status).toBe('available')
    expect(presentation.finiteCatalog.find((node) => node.id === 'PT101')).toMatchObject({
      nextEffect: '每次贯体+1层，最多4层；下次施法每层伤害+3%',
      compatibleFamilyIds: ['pierce-arrow', 'curve-return'],
      prerequisiteIds: ['PT001'],
      scope: '贯穿破甲路线的下一次施法',
    })
    expect(presentation.finiteCatalog.find((node) => node.id === 'PT201')).toMatchObject({
      status: 'locked',
      prerequisiteIds: ['PT001', 'PT101', 'PT102'],
      lockReason: '需先选择该路线的基础节点以锁定路线',
    })
    expect(presentation.finiteCatalog.find((node) => node.id === 'ST001')?.lockReason).toBe('当前技能栏没有该流派兼容核心技能')
  })
})
