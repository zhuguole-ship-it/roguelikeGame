import { afterEach, describe, expect, it, vi } from 'vitest'

import { playGameSound, resetGameSoundRuntimeForTests, setGameSoundNowProviderForTests, setGameSoundTestPlayer, type GameSoundId } from './audio'

describe('game audio', () => {
  afterEach(() => {
    resetGameSoundRuntimeForTests()
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

  it('throttles high-frequency horde sounds and allows them after the merge window', () => {
    const player = vi.fn()
    let now = 1000
    setGameSoundNowProviderForTests(() => now)
    setGameSoundTestPlayer(player)

    expect(playGameSound('crystal-pickup', { masterVolume: 100, effectsVolume: 100, muted: false })).toBe(true)
    expect(playGameSound('crystal-pickup', { masterVolume: 100, effectsVolume: 100, muted: false })).toBe(false)
    now += 100
    expect(playGameSound('crystal-pickup', { masterVolume: 100, effectsVolume: 100, muted: false })).toBe(true)

    expect(player).toHaveBeenCalledTimes(2)
  })

  it('defines playable program events for combat, loot, ui, and reward flow', () => {
    const player = vi.fn()
    let now = 0
    setGameSoundNowProviderForTests(() => {
      now += 250
      return now
    })
    setGameSoundTestPlayer(player)
    const events: GameSoundId[] = [
      'button',
      'crystal-pickup',
      'equipment-drop',
      'equipment-pickup',
      'boss-entry',
      'skill-cast',
      'skill-hit',
      'basic-hit',
      'enemy-death',
      'level-settle',
      'reward-confirm',
    ]

    events.forEach((event) => {
      expect(playGameSound(event, { masterVolume: 80, effectsVolume: 50, muted: false }), event).toBe(true)
    })

    expect(player.mock.calls.map(([id]) => id)).toEqual(events)
  })
})
