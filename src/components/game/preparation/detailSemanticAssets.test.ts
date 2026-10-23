import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { DETAIL_ICON_BY_FIELD } from './detailIconSemantics'
import { DETAIL_SEMANTIC_MANIFEST, DETAIL_SEMANTIC_RESOURCES } from './detailSemanticAssets'
import { EQUIPMENT_DETAIL_RESOURCES } from './equipmentDetailAssets'

const root = resolve('public/assets/ui/preparation-detail-semantic-icons-v1')
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const decodeRgba = (png: Buffer) => {
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20)
  expect(png[24]).toBe(8); expect(png[25]).toBe(6); expect(png[28]).toBe(0)
  const chunks: Buffer[] = []
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at)
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + length))
    at += length + 12
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4
  const pixels = Buffer.alloc(width * height * 4)
  const paeth = (a:number,b:number,c:number) => {
    const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c)
    return pa<=pb&&pa<=pc?a:pb<=pc?b:c
  }
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)]
    expect(filter).toBeLessThanOrEqual(4)
    for(let x=0;x<stride;x++){
      const at=y*stride+x,a=x>=4?pixels[at-4]:0,b=y?pixels[at-stride]:0,c=y&&x>=4?pixels[at-stride-4]:0
      const prediction=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter]
      pixels[at]=(raw[y*(stride+1)+1+x]+prediction)&255
    }
  }
  return {width,height,pixels}
}

describe('additive semantic glyphs provenance and runtime loading',()=>{
  it('has a real scene resource for every mapped icon, no neutral or nonexistent resource',()=>{
    for(const id of Object.values(DETAIL_ICON_BY_FIELD))expect(EQUIPMENT_DETAIL_RESOURCES[id]??DETAIL_SEMANTIC_RESOURCES[id],id).toBeDefined()
    expect(DETAIL_SEMANTIC_MANIFEST.resources).toHaveLength(37)
    for(const resource of DETAIL_SEMANTIC_MANIFEST.resources){
      expect(resource.url).toContain('/assets/ui/preparation-detail-semantic-icons-v1/')
      expect(resource.url).not.toMatch(/draft|developer-assets|\/Users\/|fixture|generated_images/)
      expect(resource.version).toMatch(/^[a-f0-9]{64}$/)
    }
  })
  it('verifies all formal 64px RGBA glyphs against the generated hashes and provenance',()=>{
    const manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8'))
    const provenance=JSON.parse(readFileSync(resolve(root,'provenance.json'),'utf8'))
    expect(readFileSync(resolve(root,'manifest.json'),'utf8')).toBe(readFileSync('src/components/game/preparation/detailSemanticAssets.generated.json','utf8'))
    for(const asset of manifest.resources){
      const bytes=readFileSync(resolve(root,asset.file))
      expect(hash(bytes)).toBe(asset.sha256)
      const image=decodeRgba(bytes)
      expect([image.width,image.height]).toEqual([64,64])
      const alpha=Array.from({length:4096},(_,i)=>image.pixels[i*4+3])
      expect(Math.min(...alpha)).toBe(0);expect(Math.max(...alpha)).toBe(255)
      expect(alpha.filter(a=>a>0).length).toBeGreaterThan(40)
      for(let x=0;x<64;x++){expect(alpha[x]).toBe(0);expect(alpha[63*64+x]).toBe(0);expect(alpha[x*64]).toBe(0);expect(alpha[x*64+63]).toBe(0)}
      const source=provenance.sources.find((entry:{id:string})=>entry.id===asset.id)
      expect(source.generator).toContain('one call per glyph')
      expect(source.prompt.length).toBeGreaterThan(100)
      expect(source.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(source.finalSha256).toBe(asset.sha256)
    }
    for(const reference of provenance.references)expect(reference.sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})
