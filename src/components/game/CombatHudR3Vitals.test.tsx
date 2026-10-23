import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createInitialSnapshot } from '../../game/engine'
import { getCombatHudR3SegmentClip } from '../../game/combatHudR3Assets'
import { getCombatHudFullAssetUrl } from '../../game/combatHudFullAssets'
import { useGameStore } from '../../store/useGameStore'
import { GameStatusBar } from './GameStatusBar'

afterEach(() => useGameStore.setState({...createInitialSnapshot()}))
const setup=(hp=50,shield=0) => {
  const base=createInitialSnapshot('running')
  useGameStore.setState({...base,player:{...base.player,hp,maxHp:100,shield,stamina:42}})
  return render(<GameStatusBar />)
}

describe('adopted r3 HUD integration', () => {
  it.each([0,50,100])('shows actual HP %s without shrinking or replacing shell/track', (hp) => {
    setup(hp)
    expect(screen.getByTestId('combat-health-value').textContent).toBe(`${hp} / 100`)
    expect(screen.getByTestId('combat-health-fill').style.clipPath).toBe(getCombatHudR3SegmentClip(0,hp))
    for (const layer of ['shell','track','fill']) {
      const element=screen.getByTestId(`combat-health-${layer}`)
      expect(element.className).toBe('combat-r3-layer')
      expect(element.style.width).toBe('')
      expect(element.getAttribute('srcset')).toContain('1x,')
      expect(element.getAttribute('srcset')).toContain('2x')
      expect(element.getAttribute('draggable')).toBe('false')
    }
    expect(screen.getByTestId('combat-health-shell').style.clipPath).toBe('')
  })

  it('updates HP/maxHP and shield from the store, truncates excess shield, and never writes state', () => {
    const view=setup(60,30)
    const before=useGameStore.getState()
    view.rerender(<GameStatusBar />)
    expect(useGameStore.getState()).toBe(before)
    expect(screen.getByTestId('combat-shield-fill').style.clipPath).toBe(getCombatHudR3SegmentClip(60,30))
    expect(screen.getByTestId('combat-shield-aperture').style.maskImage).toContain(getCombatHudFullAssetUrl('health-fill',2))
    act(() => useGameStore.setState({player:{...before.player,hp:180,maxHp:200,shield:80}}))
    expect(screen.getByTestId('combat-health-bar').getAttribute('aria-label')).toBe('生命 180 / 200')
    expect(screen.getByTestId('combat-health-fill').style.clipPath).toBe(getCombatHudR3SegmentClip(0,90))
    expect(screen.getByTestId('combat-shield-fill').style.clipPath).toBe(getCombatHudR3SegmentClip(90,10))
    expect(screen.getByTestId('combat-stamina-value').textContent).toBe('42 / 100')
    expect(screen.queryByText(/法力|魔法/)).toBeNull()
    expect(screen.getByTestId('combat-vitals-hud').querySelector('button,input,[tabindex]')).toBeNull()
  })

  it('uses the measured portrait cavity and keeps the pixel character independent of the smooth frame', () => {
    setup()
    expect(screen.getByTestId('combat-hud-portrait').getAttribute('src')).toContain('combat-hud-v2/archer-portrait-v2.png')
    expect(screen.getByTestId('combat-hud-portrait-aperture').style.maskImage).toContain('portrait-content-mask-2x.png')
    expect(screen.getByTestId('combat-hud-portrait-r3-frame').className).toBe('combat-r3-layer')
    expect(screen.getByTestId('combat-hud-portrait-frame').className).not.toContain('border')
  })

  it.each(['idle','game-over','level-clear','pause'] as const)('preserves phase/modal suppression: %s', (mode) => {
    setup()
    act(() => useGameStore.setState({phase:mode==='pause'?'paused':mode,pauseMenuOpen:mode==='pause'}))
    expect(screen.queryByTestId('combat-vitals-hud')).toBeNull()
  })

  it('keeps no motion, smooth UI, original pixel portrait and fixed aspect ratios in the scoped stylesheet', () => {
    const css=readFileSync(resolve(process.cwd(),'src/components/game/combatHudR3.css'),'utf8')
    expect(css).toContain('aspect-ratio: 411 / 112')
    expect(css).toContain('aspect-ratio: 283 / 35')
    expect(css).toMatch(/\.combat-r3-layer \{[^}]*image-rendering: auto/)
    expect(css).toMatch(/\.combat-r3-original-portrait \{[^}]*image-rendering: pixelated/)
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('animation: none; transition: none')
    expect(css).toContain('width: min(calc(100vw - 1rem), 320px)')
    expect(css).toContain('width: min(411px, calc((100vw - 560px) / 2 - 2rem))')
  })

  it.each([320,390,768,1024,1280,1440,1920])('checks declared vitals/skill layout arithmetic at %spx (not browser layout)', (width) => {
    // Mirrors the explicit CSS contract above; jsdom has no layout engine.
    const inset=width<768?8:16
    const mapWidth=Math.max(104,Math.min(192,width*.15))
    const hudWidth=Math.min(411,width-mapWidth-3*inset-8)
    const height=hudWidth*112/411
    expect(hudWidth+2*inset+8).toBeLessThanOrEqual(width-mapWidth-inset)
    expect(height).toBeLessThanOrEqual(112)
    const skillWidth=width<768?72:96
    const skillGap=Math.max(8,Math.min(24,width*.02))
    expect(3*skillWidth+2*skillGap+2*inset).toBeLessThanOrEqual(width)
    const portraitWidth=hudWidth*120/411
    const healthWidth=hudWidth*283/411
    expect(portraitWidth+healthWidth+hudWidth*8/411).toBeCloseTo(hudWidth,6)
  })
})
