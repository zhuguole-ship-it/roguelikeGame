import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readHomepageLayout = () => (
  JSON.parse(readFileSync(`${process.cwd()}/public/assets/godot-ui/main-menu-layout.json`, 'utf8'))
)

describe('sync_godot_homepage_layout', () => {
  it('keeps exported Godot menu hitboxes aligned with the centered homepage buttons', () => {
    const layout = readHomepageLayout()
    const clickAreasById = new Map(layout.clickAreas.map((area) => [area.id, area]))
    const start = clickAreasById.get('start')
    const character = clickAreasById.get('character')
    const inventory = clickAreasById.get('inventory')
    const settings = clickAreasById.get('settings')

    expect(start?.rect.topPct).toBeGreaterThan(39)
    expect(start?.rect.topPct).toBeLessThan(41)
    expect(character?.rect.topPct).toBeGreaterThan(47)
    expect(character?.rect.topPct).toBeLessThan(49)
    expect(inventory?.rect.topPct).toBeGreaterThan(54)
    expect(inventory?.rect.topPct).toBeLessThan(56)
    expect(settings?.rect.topPct).toBeGreaterThan(61)
    expect(settings?.rect.topPct).toBeLessThan(63)
    expect(Math.abs(character.rect.topPct - inventory.rect.topPct)).toBeGreaterThan(5)
    expect(Math.abs(start.rect.topPct - character.rect.topPct)).toBeGreaterThan(5)
  })
})
