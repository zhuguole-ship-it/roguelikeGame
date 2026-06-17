import { afterEach, describe, expect, it, vi } from 'vitest'

import { playGameSound, setGameSoundTestPlayer } from './audio'

describe('game audio', () => {
  afterEach(() => {
    setGameSoundTestPlayer(null)
  })

  it('does not play when muted or at zero volume', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)

    expect(playGameSound('button', { masterVolume: 80, effectsVolume: 75, muted: true })).toBe(false)
    expect(playGameSound('button', { masterVolume: 0, effectsVolume: 75, muted: false })).toBe(false)
    expect(player).not.toHaveBeenCalled()
  })

  it('scales playback by master and effects volume', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)

    expect(playGameSound('crystal-pickup', { masterVolume: 50, effectsVolume: 40, muted: false })).toBe(true)

    expect(player).toHaveBeenCalledWith('crystal-pickup', 0.2)
  })
})
