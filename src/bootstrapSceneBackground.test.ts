import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('pre-React scene loading background', () => {
  it('installs the approved dark fallback before any root or module script can paint', () => {
    const styleStart = html.indexOf('<style id="bootstrap-scene-background">')
    const styleEnd = html.indexOf('</style>', styleStart)
    const rootStart = html.indexOf('<div id="root">')
    const moduleStart = html.indexOf('<script type="module"')
    const style = html.slice(styleStart, styleEnd)

    expect(styleStart).toBeGreaterThan(-1)
    expect(styleEnd).toBeGreaterThan(styleStart)
    expect(styleEnd).toBeLessThan(rootStart)
    expect(styleEnd).toBeLessThan(moduleStart)
    expect(style).toMatch(/html,\s*body,\s*#root\s*{[^}]*background-color:\s*#15100e\s*!important;/s)
    expect(style).not.toMatch(/(?:#fff(?:fff)?|white)/i)
    expect(html).toContain('<meta name="theme-color" content="#15100e" />')
  })

  it('keeps the empty root viewport-sized before React mounts', () => {
    const style = html.slice(
      html.indexOf('<style id="bootstrap-scene-background">'),
      html.indexOf('</style>', html.indexOf('<style id="bootstrap-scene-background">')),
    )
    expect(style).toMatch(/html,\s*body\s*{[^}]*height:\s*100%;[^}]*margin:\s*0;/s)
    expect(style).toMatch(/#root\s*{[^}]*min-height:\s*100vh;/s)
  })
})
