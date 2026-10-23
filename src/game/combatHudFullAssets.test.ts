import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMBAT_HUD_FULL_ASSET_IDS, COMBAT_HUD_FULL_PRELOAD_IDS, getCombatHudFullAssetRecord, getCombatHudFullAssetUrl, getCombatHudFullSrcSet } from './combatHudFullAssets'
import { buildCombatSceneAssetDependencyDescriptor } from './combatLoading'
import { ARCHER_CORE_SKILLS, ARCHER_SKILL_EVOLUTIONS } from './archerSkillEvolution'
import { getArcherSkillIconAssetPath } from './archerSkillIcons'

const root = process.cwd()
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const manifestBytes = readFileSync(resolve(root, 'public/assets/ui/combat-hud-dark-metal-full-r3/manifest.json'))
const manifest = JSON.parse(manifestBytes.toString())
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('full HUD adopted pack', () => {
  it('audits dynamic skill icons and reports existing name-only presentations without synthesizing art', () => {
    const presentations = [...ARCHER_CORE_SKILLS, ...ARCHER_SKILL_EVOLUTIONS]
    const nameOnly = presentations.filter((item) => !getArcherSkillIconAssetPath(item.id)).map(({ id, name }) => ({ id, name }))
    const missingFiles = presentations.map((item) => ({ id: item.id, path: getArcherSkillIconAssetPath(item.id) }))
      .filter((item) => item.path && !existsSync(resolve(root, 'public', item.path)))
    process.stdout.write(`HUD_ICON_AUDIT ${JSON.stringify({ count: presentations.length, nameOnly, missingFiles })}\n`)
    expect(missingFiles).toEqual([])
  })
  it('verifies the frozen published manifest and every independent 1x/2x RGBA layer', () => {
    // Source-byte comparisons belong to the retained local offline audit.
    // Published tests must be reproducible without the unshipped review files.
    expect(sha(manifestBytes)).toBe('571b163b7d906033a1857bac96926da3a9e29f957f6dc74efe81b5b3d3ca68ff')
    expect(manifest.schemaVersion).toBe('combat-hud-dark-metal-full-r3')
    expect(manifest.runtimeEligible).toBe(true)
    expect(manifest.assets).toHaveLength(28)
    expect(new Set(manifest.assets.map((entry: { fileName: string }) => entry.fileName)).size).toBe(28)
    expect(COMBAT_HUD_FULL_ASSET_IDS).toHaveLength(14)
    for (const id of COMBAT_HUD_FULL_ASSET_IDS) for (const scale of [1, 2] as const) {
      const record = getCombatHudFullAssetRecord(id, scale)
      expect(record.fileName).toBe(`${id}-${scale}x.png`)
      const bytes = readFileSync(resolve(root, 'public/assets/ui/combat-hud-dark-metal-full-r3', record.fileName))
      expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      expect(sha(bytes)).toBe(record.sha256)
      expect(bytes.readUInt32BE(16)).toBe(record.width)
      expect(bytes.readUInt32BE(20)).toBe(record.height)
      expect(record.width).toBe(getCombatHudFullAssetRecord(id, 1).width * scale)
      expect(record.height).toBe(getCombatHudFullAssetRecord(id, 1).height * scale)
      expect(bytes[24]).toBe(8)
      expect(bytes[25]).toBe(6)
      expect(getCombatHudFullSrcSet(id)).toContain(`${getCombatHudFullAssetUrl(id, scale)} ${scale}x`)
      if (/^(skill-|minimap-)/.test(id)) expect(record.source).toContain('frame-concept-remake-r2/assets/')
      if (/^(health-fill|stamina-fill|mana-fill)$/.test(id)) expect(record.source).toContain('full-integration-r2/option2-review/')
      if (/^(portrait-|health-shell|health-track)/.test(id)) expect(record.source).toContain('public/assets/ui/combat-hud-dark-metal-r3/')
      expect(record.source).not.toContain('attempts')
    }
  })

  it('preloads all visible layers at both DPRs with hashes, but no mana or obsolete frames', () => {
    const { resources } = buildCombatSceneAssetDependencyDescriptor({ runtimeMode: 'formal-run', campaign: 1, level: 1, difficulty: 'normal', battlefieldMode: 'infinite', professionId: 'archer' })
    expect(COMBAT_HUD_FULL_PRELOAD_IDS).toHaveLength(13)
    for (const id of COMBAT_HUD_FULL_PRELOAD_IDS) for (const scale of [1, 2] as const) {
      expect(resources.find((r) => r.key === `combat-hud.full.${id}.${scale}x`)).toMatchObject({ url: getCombatHudFullAssetUrl(id, scale), version: getCombatHudFullAssetRecord(id, scale).sha256, domain: 'combat-ui' })
    }
    expect(resources.filter((r) => /combat-hud\.(health|stamina|skillSlots)$|mana-fill|combat-hud\.r3\./.test(r.key))).toEqual([])
    expect(resources.find((r) => r.key === 'combat-hud.portrait')).toBeTruthy()
  })

  it.each(['/', '/roguelikeGame/'])('resolves only project runtime URLs under %s', async (base) => {
    vi.stubEnv('BASE_URL', base); vi.resetModules()
    const api = await import('./combatHudFullAssets')
    for (const id of api.COMBAT_HUD_FULL_ASSET_IDS) {
      expect(api.getCombatHudFullAssetUrl(id, 2)).toBe(`${base}assets/ui/combat-hud-dark-metal-full-r3/${id}-2x.png`)
      expect(api.getCombatHudFullAssetUrl(id)).not.toMatch(/output|draft|Users|attempts/)
    }
  })

  it('declares responsive edge clusters, non-intercepting art, closed tool list and reduced motion', () => {
    const css = readFileSync(resolve(root, 'src/components/game/combatHudFull.css'), 'utf8')
    expect(css).toContain('--combat-full-map: clamp(104px, 15vw, 192px)')
    expect(css).toContain('.combat-full-tool-list[hidden] { display: none; }')
    expect(css).toMatch(/\.combat-full-layer \{[^}]*pointer-events: none/)
    expect(css).toMatch(/\.combat-full-vitals\.combat-r3-vitals \{[^}]*top: var\(--combat-full-inset\)/)
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
