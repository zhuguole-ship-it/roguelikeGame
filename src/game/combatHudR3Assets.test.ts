import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMBAT_HUD_R3_ASSETS, COMBAT_HUD_R3_HEALTH_APERTURE, getCombatHudR3AssetUrl, getCombatHudR3SegmentClip, getCombatHudR3SrcSet } from './combatHudR3Assets'
import type { CombatHudR3Asset } from './combatHudR3Assets'
import { COMBAT_HUD_V2_RUNTIME_ASSETS } from './combatHudAssets'
import { buildCombatSceneAssetDependencyDescriptor } from './combatLoading'
import { getCombatHudFullAssetRecord, getCombatHudFullAssetUrl } from './combatHudFullAssets'

const root=resolve(process.cwd(), 'public/assets/ui/combat-hud-dark-metal-r3')
const read=(name: string) => readFileSync(resolve(root,name))
const sha=(bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const manifestBytes=read('manifest.json')
const manifest=JSON.parse(manifestBytes.toString())
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('adopted HUD r3 runtime resources', () => {
  it('verifies the ten published layers against the frozen manifest and independent runtime hashes', () => {
    expect(sha(manifestBytes)).toBe('71d777142b06f7397ecb7b8f3f001b8c675a29bbafce22b5c05ff2d722a2e3b7')
    expect(manifest.schemaVersion).toBe('combat-hud-dark-metal-r3-runtime-v1')
    expect(manifest.runtimeEligible).toBe(true)
    expect(manifest.assets).toHaveLength(10)
    expect(new Set(manifest.assets.map((entry: { fileName: string }) => entry.fileName)).size).toBe(10)
    for (const [id,entry] of Object.entries(COMBAT_HUD_R3_ASSETS)) {
      for (const scale of [1,2] as const) {
        const fileName=`${id}-${scale}x.png`
        const bytes=read(fileName)
        expect(bytes.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]))
        expect(bytes.readUInt32BE(16)).toBe(entry.width*scale)
        expect(bytes.readUInt32BE(20)).toBe(entry.height*scale)
        expect(bytes[24]).toBe(8)
        expect(bytes[25]).toBe(6)
        expect(sha(bytes)).toBe(entry.hashes[scale-1])
        const record=manifest.assets.find((a: { fileName: string }) => a.fileName===fileName)
        expect(record.sha256).toBe(sha(bytes))
        expect(record.width).toBe(entry.width*scale)
        expect(record.height).toBe(entry.height*scale)
        expect(getCombatHudR3SrcSet(id as CombatHudR3Asset)).toContain(`${getCombatHudR3AssetUrl(id as CombatHudR3Asset,scale)} ${scale}x`)
      }
    }
  })

  it('keeps the original portrait bytes and corrects its current size/hash declaration', () => {
    const bytes=readFileSync(resolve(process.cwd(),'public/assets/ui/combat-hud-v2/archer-portrait-v2.png'))
    expect(COMBAT_HUD_V2_RUNTIME_ASSETS.portrait).toMatchObject({ width:1200,height:1200,sha256:sha(bytes) })
    expect(bytes.readUInt32BE(16)).toBe(1200)
    expect(sha(bytes)).toBe('dd735f70b17bdf30e6058f56fd0d424a2df91a6d01ad1e177c579b21509ed13d')
  })

  it('retains frozen provenance identifiers without claiming to reverify unshipped review files', () => {
    // The 45-file source inventory is checked by the retained local offline
    // audit, not by this published test. These are provenance identities only.
    expect(manifest.frozenReviewManifestSha256).toBe('db9e004b53d2a9e5b5ee8e841e3b4a730df10b5dde074ba95f841e39119eab83')
    expect(manifest.frozenReviewInventorySha256).toBe('7ed89cffc9d27b4eea6c6cf884320495960db958efc08d47edcf5e3ca4a3fb6c')
  })

  it.each(['/', '/roguelikeGame/'])('resolves all runtime URLs under actual BASE_URL %s', async (base) => {
    vi.stubEnv('BASE_URL',base);vi.resetModules()
    const module=await import('./combatHudR3Assets')
    for (const id of Object.keys(module.COMBAT_HUD_R3_ASSETS) as CombatHudR3Asset[]) {
      expect(module.getCombatHudR3AssetUrl(id,2)).toBe(`${base}assets/ui/combat-hud-dark-metal-r3/${id}-2x.png`)
      expect(module.getCombatHudR3AssetUrl(id)).not.toMatch(/output|draft|Users|revision-0[12]/)
    }
  })

  it('preloads the adopted portrait and shell/track via the full HUD pack without an obsolete health frame', () => {
    const descriptor=buildCombatSceneAssetDependencyDescriptor({runtimeMode:'formal-run',campaign:1,level:1,difficulty:'normal',battlefieldMode:'infinite',professionId:'archer'})
    const resources=descriptor.resources
    expect(resources.find((r) => r.key==='combat-hud.health')).toBeUndefined()
    expect(resources.find((r) => r.key==='combat-hud.portrait')?.version).toBe(COMBAT_HUD_V2_RUNTIME_ASSETS.portrait.sha256)
    for (const [id,entry] of Object.entries(COMBAT_HUD_R3_ASSETS)) {
      if (id === 'health-fill') continue // User-selected red fill supersedes the old r3 fill.
      for (const scale of [1,2] as const) {
        expect(getCombatHudFullAssetRecord(id as CombatHudR3Asset,scale).sha256).toBe(entry.hashes[scale-1])
        expect(resources.find((r) => r.key===`combat-hud.full.${id}.${scale}x`)).toMatchObject({url:getCombatHudFullAssetUrl(id as CombatHudR3Asset,scale),version:entry.hashes[scale-1],domain:'combat-ui'})
      }
    }
  })

  it('clips at measured opening coordinates without rescaling a painted layer', () => {
    expect(COMBAT_HUD_R3_HEALTH_APERTURE.leftPercent).toBeCloseTo((2+137*278/2086)/283*100,8)
    expect(getCombatHudR3SegmentClip(0,0)).toBe('inset(0 100% 0 0)')
    expect(getCombatHudR3SegmentClip(0,100)).toBe('inset(0 0% 0 0%)')
    expect(getCombatHudR3SegmentClip(100,0)).toBe('inset(0 100% 0 0)')
    const halfRight=Number(getCombatHudR3SegmentClip(0,50).split(' ')[1].replace('%',''))
    expect(halfRight).toBeCloseTo(100-(COMBAT_HUD_R3_HEALTH_APERTURE.leftPercent+COMBAT_HUD_R3_HEALTH_APERTURE.rightPercent)/2,10)
  })
})
