import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LocalBattleTestSpawnOption } from '../../game/types'
import type { LocalBattleSessionController } from './LocalBattleTestPanel'
import { LocalBattleTestPanel } from './LocalBattleTestPanel'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const activeSession = {
  active: true,
  paused: true,
  enemyCount: 0,
}

const spawnOptions: LocalBattleTestSpawnOption[] = [
  { entityId: 'ordinary-a', name: '普通怪', group: 'ordinary', enabled: true, maxCount: 20 },
  { entityId: 'boss-a', name: '典狱长', group: 'boss', enabled: false, disabledReason: 'Boss 尚未通过验收', maxCount: 20 },
]

const createController = (): LocalBattleSessionController => ({
  start: vi.fn(() => ({ ok: true, spawned: 0, errors: [] })),
  exit: vi.fn(),
  clearMonsters: vi.fn(() => ({ ok: true, spawned: 0, errors: [] })),
  applyMonsterConfig: vi.fn(() => ({ ok: true, spawned: 3, errors: [] })),
})

describe('LocalBattleTestPanel', () => {
  it('renders the real session controls and preserves A disabled reasons', () => {
    const controller = createController()
    render(<LocalBattleTestPanel controller={controller} session={{ active: false, paused: true, enemyCount: 0 }} spawnOptions={spawnOptions} onClose={() => undefined} />)

    expect(screen.getByRole('dialog', { name: '本地战斗测试' })).toBeTruthy()
    expect((screen.getByTestId('local-battle-enter') as HTMLButtonElement).disabled).toBe(false)

    // The monster button is unavailable until A's real session is active.
    expect((screen.getByTestId('local-battle-monsters-toggle') as HTMLButtonElement).disabled).toBe(true)
  })

  it('does not render outside a local runtime', () => {
    vi.stubGlobal('window', { location: { hostname: 'dev.example.com' } })

    render(<LocalBattleTestPanel controller={createController()} session={{ active: false, paused: true, enemyCount: 0 }} spawnOptions={spawnOptions} onClose={() => undefined} />)

    expect(screen.queryByRole('dialog', { name: '本地战斗测试' })).toBeNull()
  })

  it('starts the A session and reports the action result', () => {
    const controller = createController()
    render(<LocalBattleTestPanel controller={controller} session={{ active: false, paused: true, enemyCount: 0 }} spawnOptions={spawnOptions} onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('local-battle-enter'))

    expect(controller.start).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('local-battle-message').textContent).toContain('已进入第一关本地战斗测试')
  })

  it('validates an empty monster configuration without calling A apply', () => {
    const controller = createController()
    render(<LocalBattleTestPanel controller={controller} session={activeSession} spawnOptions={spawnOptions} onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('local-battle-monsters-toggle'))
    fireEvent.click(screen.getByTestId('local-battle-apply-monsters'))

    expect(screen.getByTestId('local-battle-message').textContent).toContain('至少选择一种可用怪物')
    expect(controller.applyMonsterConfig).not.toHaveBeenCalled()
  })

  it('passes selected enabled entities and counts to A apply', () => {
    const controller = createController()
    render(<LocalBattleTestPanel controller={controller} session={activeSession} spawnOptions={spawnOptions} onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('local-battle-monsters-toggle'))
    const entityRow = screen.getByTestId('local-battle-entity-ordinary-a')
    const checkbox = entityRow.querySelector('input[type="checkbox"]') as HTMLInputElement
    const count = entityRow.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.click(checkbox)
    fireEvent.change(count, { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('local-battle-apply-monsters'))

    expect(controller.applyMonsterConfig).toHaveBeenCalledWith([{ entityId: 'ordinary-a', count: 3 }])
    expect(screen.getByTestId('local-battle-message').textContent).toContain('生成 3 只')
  })

  it('uses the real exit action and closes the panel', () => {
    const controller = createController()
    const onClose = vi.fn()
    render(<LocalBattleTestPanel controller={controller} session={activeSession} spawnOptions={spawnOptions} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('local-battle-exit'))

    expect(controller.exit).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
