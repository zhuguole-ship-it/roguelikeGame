/**
 * UI-localized wording for runtime talent entries whose approved player-facing
 * copy is more specific than the compact engine description.  IDs remain the
 * sole link to the core-owned talent definitions; this module carries no
 * candidate, prerequisite, or gameplay rule data.
 */
const RUN_TALENT_DESCRIPTION_OVERRIDES: Readonly<Record<string, string>> = {
  run_common_09: '5秒内3个不同主动技能造成实伤后，第三个首次命中处小范围共鸣余波。',
  run_common_10: '冲刺结束1.5秒内下一主动技能首次实伤命中触发小范围追击爆裂。',
}

export const getRunTalentDisplayDescription = (id: string | undefined, fallback: string) => (
  id ? RUN_TALENT_DESCRIPTION_OVERRIDES[id] ?? fallback : fallback
)
