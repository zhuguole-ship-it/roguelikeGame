import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EQUIPMENT_DETAIL_ASSETS, EQUIPMENT_DETAIL_MANIFEST } from './equipmentDetailAssets'
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
describe('adopted equipment detail formal assets',()=>{
  it('publishes exactly 31 formal PNGs with their frozen-source hashes',()=>{
    const dir=resolve('public/assets/ui/preparation-equipment-detail-v1')
    const provenance=JSON.parse(readFileSync(resolve(dir,'provenance.json'),'utf8'))
    for(const sha of Object.values(provenance.sourceHashes)) expect(sha).toMatch(/^[a-f0-9]{64}$/)
    expect(Object.values(EQUIPMENT_DETAIL_ASSETS)).toHaveLength(31)
    expect(provenance.files).toHaveLength(31)
    expect(readFileSync(resolve(dir,'manifest.json'),'utf8')).toBe(readFileSync(resolve('src/components/game/preparation/equipmentDetailAssets.generated.json'),'utf8'))
    for(const asset of Object.values(EQUIPMENT_DETAIL_ASSETS)){
      const bytes=readFileSync(resolve(dir,asset.file))
      expect(hash(bytes)).toBe(asset.sha256)
      expect(provenance.files).toContainEqual({id:asset.id,file:asset.file,sha256:asset.sha256})
      expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual(asset.size)
      expect(bytes[25]).toBe(6)
    }
    expect(provenance.copyMode).toBe('byte-for-byte; staging remains frozen')
  })
  it('runtime manifest loads only the separate formal package, not showcase or evidence',()=>{
    for(const resource of EQUIPMENT_DETAIL_MANIFEST.resources){
      expect(resource.url).toContain('/assets/ui/preparation-equipment-detail-v1/')
      expect(resource.url).not.toMatch(/developer-assets|fixture|evidence|draft|\/Users\//)
    }
  })
})
