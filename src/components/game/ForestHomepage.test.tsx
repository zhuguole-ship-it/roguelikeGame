import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FOREST_HOME_MENU_ITEMS, ForestHomepage, getForestHomepageMenuLayout } from './ForestHomepage'

afterEach(() => vi.restoreAllMocks())
const viewports = [[2052, 1154], [1440, 900], [1920, 1080], [390, 844], [768, 1024], [1280, 600], [844, 390], [3840, 2160]]
const previousFontScale = (width: number, height: number) => Math.min(width * 0.13 / 480, height * 0.56 / 1031.04)
const conceptFontScale = (width: number, height: number) => Math.min(width / 2052, height / 1154)

describe('forest home paper menu', () => {
  it.each(viewports)('fills the fixed-inset paper region at %dx%d', (width, height) => {
    const paper = getForestHomepageMenuLayout(width, height)
    const left = width - paper.right - paper.width
    const bottom = height - paper.top - paper.height
    expect(left).toBeCloseTo(width * 0.586, 10)
    expect(paper.right).toBeCloseTo(width * 0.104, 10)
    expect(paper.top).toBeCloseTo(height * 0.069, 10)
    expect(bottom).toBeCloseTo(height * 0.091, 10)
    expect(paper.width).toBeCloseTo(width * 0.31, 10)
    expect(paper.height).toBeCloseTo(height * 0.84, 10)
    expect(paper.fontScale).toBeCloseTo(previousFontScale(width, height), 12)
  })

  it.each(viewports)('keeps symmetric hit areas and scales each rose glyph outline at %dx%d', (width, height) => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height)
    render(<ForestHomepage onOpen={vi.fn()} />)
    const menu = screen.getByTestId('forest-home-menu')
    const buttons = within(menu).getAllByRole('button')
    const centers = buttons.map((button) => parseFloat(button.style.top))
    expect(centers).toEqual([20.6, 30.4, 40.2, 50, 59.8, 69.6, 79.4])
    for (let index = 0; index < 3; index++) expect((centers[index] + centers[6 - index]) / 2).toBeCloseTo(50, 10)
    for (let index = 1; index < centers.length; index++) expect(centers[index] - centers[index - 1]).toBeCloseTo(9.8, 10)
    expect(centers[0]).toBeCloseTo(100 - centers[6], 10)
    for (const button of buttons) {
      expect(button.parentElement).toBe(menu)
      expect(button.style.left).toBe('49.8%')
      expect(button.style.width).toBe('70%')
      expect(button.style.height).toBe('8%')
      expect(button.style.transform).toBe('translate(-50%, -50%)')
      expect(button.className).toContain('bg-transparent')
      expect(button.className).toContain('text-[#ae8b91]')
      expect(button.className).toContain('hover:text-[#c15d6e]')
      expect(button.className).toContain('focus-visible:text-[#c15d6e]')
      expect(button.className).not.toMatch(/brightness|(?:^|\s)text-\[#c15d6e\]/)
      expect(button.className).toContain('focus-visible:ring-[#e9c66f]')
      expect(button.querySelector('img')).toBeNull()
      const text = button.querySelector('span')!
      expect(text.className).toContain('font-pixel')
      expect(parseFloat(text.style.fontSize)).toBeCloseTo(38 * conceptFontScale(width, height), 10)
      expect(parseFloat(text.style.letterSpacing)).toBeCloseTo(4 * previousFontScale(width, height), 10)
      expect(parseFloat(text.style.getPropertyValue('-webkit-text-stroke-width'))).toBeCloseTo(conceptFontScale(width, height), 10)
      expect(text.style.getPropertyValue('-webkit-text-stroke-color')).toBe('rgb(141, 99, 108)')
      expect(text.style.textShadow).toBe('')
    }
    expect(menu.querySelectorAll('img')).toHaveLength(1)
    expect(screen.getByTestId('forest-home-menu-paper')).toHaveAttribute('data-scene-asset-logical-url', expect.stringContaining('homepage-forest-v1/menu-paper.webp'))
    expect(screen.getByTestId('forest-home-menu-paper').className).toContain('object-fill')
    const background = screen.getByTestId('forest-home-background')
    expect(background.className).toContain('object-cover')
    expect(background.style.objectPosition).toBe('30% 82%')
    expect(menu.className).not.toMatch(/grid|overflow|transition|animate/)
  })

  it('keeps all seven routes and keyboard actions without individual frame images', async () => {
    const open = vi.fn()
    const { container } = render(<ForestHomepage onOpen={open} />)
    const menu = screen.getByRole('navigation', { name: '首页菜单' })
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(FOREST_HOME_MENU_ITEMS.map((i) => i.label))
    expect(container.querySelector('video')).toBeNull()
    expect(screen.queryByRole('button', { name: '传送门' })).toBeNull()
    expect(screen.getByTestId('forest-home-background')).toHaveAttribute('data-scene-asset-logical-url', expect.stringContaining('homepage-forest-v1/background.webp'))
    FOREST_HOME_MENU_ITEMS.forEach((item) => fireEvent.click(within(menu).getByRole('button', { name: item.label })))
    expect(open.mock.calls.map(([id]) => id)).toEqual(FOREST_HOME_MENU_ITEMS.map((i) => i.modal))
    const user = userEvent.setup()
    within(menu).getByRole('button', { name: '开始游戏' }).focus()
    await user.keyboard('{Enter}{Tab}')
    expect(open).toHaveBeenLastCalledWith('campaign')
    expect(within(menu).getByRole('button', { name: '角色选择' })).toHaveFocus()
    await user.keyboard(' ')
    expect(open).toHaveBeenLastCalledWith('character')
  })

  it('refits on resize while keeping the central button at half the paper height', () => {
    render(<ForestHomepage onOpen={vi.fn()} />)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844)
    fireEvent(window, new Event('resize'))
    const menu = screen.getByTestId('forest-home-menu')
    expect(parseFloat(menu.style.width)).toBeCloseTo(390 * 0.31, 10)
    expect(parseFloat(menu.style.height)).toBeCloseTo(844 * 0.84, 10)
    expect(parseFloat(menu.style.top)).toBeCloseTo(844 * 0.069, 10)
    expect(parseFloat(menu.style.right)).toBeCloseTo(390 * 0.104, 10)
    expect(screen.getByRole('button', { name: '强化分解' }).style.top).toBe('50%')
  })
})
