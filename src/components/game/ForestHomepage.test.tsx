import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FOREST_HOME_MENU_ITEMS, ForestHomepage, getForestHomepageMenuLayout } from './ForestHomepage'

afterEach(() => vi.restoreAllMocks())

const viewports = [[1440, 900], [1920, 1080], [390, 844], [768, 1024], [1280, 600], [844, 390], [3840, 2160]]
// Independent R3 authority values; never use the implementation to compute expectations.
const expectedLayout = (width: number, height: number) => {
  const scale = Math.min(width * 0.13 / 480, height * 0.56 / 1031.04)
  const menuWidth = 480 * scale
  const menuHeight = 1031.04 * scale
  const left = width * 0.78 + (width * 0.13 - menuWidth) / 2
  const top = height * 0.22 + (height * 0.56 - menuHeight) / 2
  return { scale, width: menuWidth, height: menuHeight, left, top, right: width - left - menuWidth }
}

describe('forest home menu', () => {
  it.each(viewports)('centers the complete group in the independent 78/22/13/56 percent region at %dx%d', (width, height) => {
    const group = getForestHomepageMenuLayout(width, height)
    const expected = expectedLayout(width, height)
    const left = width - group.right - group.width
    expect(group.scale).toBeCloseTo(expected.scale, 12)
    expect(group.width).toBeCloseTo(expected.width, 10)
    expect(group.height).toBeCloseTo(expected.height, 10)
    expect(group.top).toBeCloseTo(expected.top, 10)
    expect(group.right).toBeCloseTo(expected.right, 10)
    expect(left + group.width / 2).toBeCloseTo(width * 0.845, 10)
    expect(group.top + group.height / 2).toBeCloseTo(height * 0.5, 10)
    expect(left).toBeGreaterThanOrEqual(width * 0.78 - 1e-9)
    expect(left + group.width).toBeLessThanOrEqual(width * 0.91 + 1e-9)
    expect(group.top).toBeGreaterThanOrEqual(height * 0.22 - 1e-9)
    expect(group.top + group.height).toBeLessThanOrEqual(height * 0.78 + 1e-9)
    expect(left - width * 0.78).toBeCloseTo(width * 0.91 - left - group.width, 10)
    expect(group.top - height * 0.22).toBeCloseTo(height * 0.78 - group.top - group.height, 10)
    expect(Math.min(width * 0.13 - group.width, height * 0.56 - group.height)).toBeCloseTo(0, 10)
    if (width === 3840) expect(group.scale).toBeGreaterThan(1)
    expect(group.width / 480).toBeCloseTo(group.scale)
    expect(group.height / (480 * 867 / 3000 * 7 + 60)).toBeCloseTo(group.scale)
  })

  it.each(viewports)('uses the one regional transform for frame, real text, gaps and centered bounds at %dx%d', (width, height) => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height)
    render(<ForestHomepage onOpen={vi.fn()} />)
    const expected = expectedLayout(width, height)
    const expectedScale = expected.scale
    const menu = screen.getByTestId('forest-home-menu')
    const scaled = screen.getByTestId('forest-home-menu-scale')
    expect(parseFloat(menu.style.width)).toBeCloseTo(480 * expectedScale, 10)
    expect(parseFloat(menu.style.height)).toBeCloseTo(1031.04 * expectedScale, 10)
    expect(parseFloat(menu.style.top)).toBeCloseTo(expected.top, 10)
    expect(parseFloat(menu.style.right)).toBeCloseTo(expected.right, 10)
    expect(scaled.style.transform).toBe(`scale(${expectedScale})`)
    expect(scaled.style.transformOrigin).toBe('top left')
    expect(scaled.style.width).toBe('480px')
    expect(parseFloat(scaled.style.height)).toBeCloseTo(1031.04)
    expect(parseFloat(scaled.style.gap) * expectedScale).toBeCloseTo(10 * expectedScale, 10)
    expect(scaled.className).toContain('flex-col')
    for (const button of within(menu).getAllByRole('button')) {
      expect(button.parentElement).toBe(scaled)
      expect(parseFloat(button.style.width) * expectedScale).toBeCloseTo(480 * expectedScale, 10)
      expect(parseFloat(button.style.height) * expectedScale).toBeCloseTo(138.72 * expectedScale, 10)
      const text = button.querySelector('span')!
      expect(parseFloat(text.style.fontSize) * expectedScale).toBeCloseTo(32 * expectedScale, 10)
      expect(parseFloat(text.style.letterSpacing) * expectedScale).toBeCloseTo(4 * expectedScale, 10)
      expect(button.style.transform).toBe('')
      expect(text.style.transform).toBe('')
    }
    const background = screen.getByTestId('forest-home-background')
    expect(background.className).toContain('object-cover')
    expect(background.style.objectPosition).toBe('30% 82%')
    expect(background.style.transform).toBe('')
    expect(menu.className).not.toMatch(/grid|overflow|transition|animate/)
  })

  it('has exactly seven stable routes, real gold labels and the single approved proportional frame', async () => {
    const open = vi.fn()
    const { container } = render(<ForestHomepage onOpen={open} />)
    const menu = screen.getByRole('navigation', { name: '首页菜单' })
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(FOREST_HOME_MENU_ITEMS.map((i) => i.label))
    expect(container.querySelector('video')).toBeNull()
    expect(screen.queryByRole('button', { name: '传送门' })).toBeNull()
    expect(screen.getByTestId('forest-home-background')).toHaveAttribute('data-scene-asset-logical-url', expect.stringContaining('homepage-forest-v1/background.png'))
    const frames = menu.querySelectorAll('img')
    expect(frames).toHaveLength(7)
    frames.forEach((frame) => expect(frame).toHaveAttribute('data-scene-asset-logical-url', expect.stringContaining('run-settlement-black-gold/title-frame-3x.png')))
    FOREST_HOME_MENU_ITEMS.forEach((item) => fireEvent.click(within(menu).getByRole('button', { name: item.label })))
    expect(open.mock.calls.map(([id]) => id)).toEqual(FOREST_HOME_MENU_ITEMS.map((i) => i.modal))
    const user = userEvent.setup()
    const first = within(menu).getByRole('button', { name: '开始游戏' })
    first.focus()
    await user.keyboard('{Enter}{Tab}')
    expect(open).toHaveBeenLastCalledWith('campaign')
    expect(within(menu).getByRole('button', { name: '角色选择' })).toHaveFocus()
    await user.keyboard(' ')
    expect(open).toHaveBeenLastCalledWith('character')
  })

  it('responds to height and width changes only through one parent scale with no menu scrolling/reorder or motion', () => {
    render(<ForestHomepage onOpen={vi.fn()} />)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844)
    fireEvent(window, new Event('resize'))
    const layout = expectedLayout(390, 844)
    expect(screen.getByTestId('forest-home-menu-scale').style.transform).toBe(`scale(${layout.scale})`)
    expect(parseFloat(screen.getByTestId('forest-home-menu').style.top)).toBeCloseTo(layout.top, 10)
    expect(parseFloat(screen.getByTestId('forest-home-menu').style.right)).toBeCloseTo(layout.right, 10)
    expect(screen.getByTestId('forest-home-menu-scale').className).toContain('flex-col')
    expect(screen.getByTestId('forest-home-menu').className).not.toMatch(/grid|overflow|hidden|transition|animate/)
    expect(screen.getByRole('button', { name: '开始游戏' }).style.width).toBe('480px')
  })
})
