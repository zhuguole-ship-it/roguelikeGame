import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { attachGameButtonAudio } from './gameButtonAudio'
import { playGameSound, resetGameSoundRuntimeForTests, setGameSoundTestPlayer } from './audio'
import { createInitialSnapshot } from './engine'

const disposers: (() => void)[] = []
afterEach(() => { disposers.splice(0).forEach((dispose) => dispose()); cleanup(); resetGameSoundRuntimeForTests() })

it('captures mouse/Enter/Space once per activation and suppresses the same Store button call', async () => {
  const player = vi.fn()
  const settings = createInitialSnapshot('idle').audioSettings
  setGameSoundTestPlayer(player)
  disposers.push(attachGameButtonAudio(() => settings))
  const action = vi.fn(() => { playGameSound('button', settings) })
  render(<button onClick={action}>真实按钮</button>)
  const user = userEvent.setup()
  const button = screen.getByRole('button', { name: '真实按钮' })
  await user.click(button)
  await user.keyboard('{Enter}')
  await user.keyboard(' ')
  expect(action).toHaveBeenCalledTimes(3)
  expect(player.mock.calls.map(([id]) => id)).toEqual(['button', 'button', 'button'])
  playGameSound('button', settings) // Non-DOM action still works.
  expect(player).toHaveBeenCalledTimes(4)
})
it('disabled/aria-disabled, hover, focus and rerender do not activate audio', async () => {
  const player = vi.fn()
  setGameSoundTestPlayer(player)
  disposers.push(attachGameButtonAudio(() => createInitialSnapshot('paused').audioSettings))
  const view = render(<><button disabled>禁用</button><button aria-disabled="true">不可用</button><button>正常</button></>)
  fireEvent.click(screen.getByText('禁用'))
  fireEvent.click(screen.getByText('不可用'))
  fireEvent.mouseEnter(screen.getByText('正常'))
  fireEvent.focus(screen.getByText('正常'))
  view.rerender(<button>重渲染</button>)
  expect(player).not.toHaveBeenCalled()
})
it('a successful UI action may add upgrade audio but not a duplicate button cue', () => {
  const player = vi.fn()
  const settings = createInitialSnapshot('paused').audioSettings
  setGameSoundTestPlayer(player)
  disposers.push(attachGameButtonAudio(() => settings))
  render(<button onClick={() => { playGameSound('button', settings); playGameSound('functional-talent-upgrade', settings) }}>升级</button>)
  fireEvent.click(screen.getByText('升级'))
  expect(player.mock.calls.map(([id]) => id)).toEqual(['button', 'functional-talent-upgrade'])
})
