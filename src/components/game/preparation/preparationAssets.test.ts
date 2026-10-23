import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PREPARATION_ASSETS, PREPARATION_MANIFEST } from './preparationAssets'
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
const root=process.cwd()
describe('formal preparation asset provenance',()=>{
  it('publishes all runtime assets with the recorded frozen-source hashes',()=>{
    const dir=resolve(root,'public/assets/ui/preparation-formal-v1')
    const provenance=JSON.parse(readFileSync(resolve(dir,'provenance.json'),'utf8'))
    expect(provenance.sourceManifestSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(provenance.mappingSourceSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(readFileSync(resolve(dir,'manifest.json'),'utf8')).toBe(readFileSync(resolve(root,'src/components/game/preparation/assets.generated.json'),'utf8'))
    expect(provenance.pixelChanges).toBe(false)
    expect(provenance.sources).toHaveLength(336)
    expect(new Set(provenance.sources.map((source:{id:string})=>source.id)).size).toBe(336)
    for(const source of provenance.sources){
      const asset=PREPARATION_ASSETS[source.id]
      expect(asset.sha256).toBe(source.sha256)
      const bytes=readFileSync(resolve(dir,asset.file))
      expect(hash(bytes)).toBe(source.sha256)
      expect(bytes.length).toBe(source.bytes)
    }
  })
  it('loads only formal URLs and excludes fixtures, evidence and concepts',()=>{
    for(const asset of PREPARATION_MANIFEST.resources){
      expect(asset.url).toContain('/assets/ui/preparation-formal-v1/')
      expect(asset.url).not.toMatch(/developer-assets|fixture|evidence|concept|\/Users\//)
      expect(asset.version).toMatch(/^[a-f0-9]{64}$/)
    }
    expect(PREPARATION_ASSETS['A05'].sha256).toBe('2f7812a19b8628b16136a2ab7b133003f3de161527638cc6a880eb4ad7ed5de9')
  })
  it('keeps r6 scoping and geometry without leaking global CSS',()=>{
    const css=readFileSync(resolve(root,'src/components/game/preparation/PreparationOverlay.css'),'utf8')
    expect(css).toContain('.preparation-ui main{margin-bottom:16px}')
    expect(css).toContain('width:177px;height:54px')
    expect(css).toContain('translateY(-1px)')
    expect(css).toContain('prefers-reduced-motion:reduce')
    expect(PREPARATION_MANIFEST).toMatchObject({key:'preparation-formal-v1',scene:'home'})
  })
})
