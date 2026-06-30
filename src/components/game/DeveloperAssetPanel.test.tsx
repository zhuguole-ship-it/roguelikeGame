import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cloneDeveloperAssetEntity,
  developerAssetEntities,
  getDeveloperAssetStatus,
  validateDeveloperAssetEntity,
} from '../../game/assetManifest'
import { CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE } from '../../game/campaignMonsters'
import { createInitialSnapshot } from '../../game/engine'
import {
  RUNTIME_ASSET_DRAFT_STORAGE_KEY,
  clearRuntimeAssetOverrides,
  exportRuntimeAssetDraftConfig,
  getRuntimeAssetActionOverride,
  importRuntimeAssetDraftConfig,
} from '../../game/runtimeAssetOverrides'
import { useGameStore } from '../../store/useGameStore'
import { DeveloperAssetPanel, isDeveloperAssetPanelVisible } from './DeveloperAssetPanel'

const stubFileReaderDataUrls = () => {
  class MockFileReader {
    result = ''
    onload: ((event?: unknown) => void) | null = null
    onerror: ((event?: unknown) => void) | null = null

    readAsDataURL(file: File) {
      this.result = `data:${file.type || 'image/png'};base64,${file.name}`
      this.onload?.({})
    }
  }
  vi.stubGlobal('FileReader', MockFileReader)
}

afterEach(() => {
  cleanup()
  clearRuntimeAssetOverrides()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.removeItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('DeveloperAssetPanel', () => {
  it('keeps the developer entry hidden for production builds', () => {
    expect(isDeveloperAssetPanelVisible({ DEV: false, PROD: true, MODE: 'production' }, 'localhost')).toBe(false)
    expect(isDeveloperAssetPanelVisible({ DEV: true, PROD: false, MODE: 'development' }, 'localhost')).toBe(true)
  })

  it('shows debug toggles, entity actions, preview and validation state', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByLabelText('生命无限'))
    fireEvent.click(screen.getByLabelText('不攻击'))

    expect(useGameStore.getState().debugControls.infiniteHealth).toBe(true)
    expect(useGameStore.getState().debugControls.disableAttacks).toBe(true)
    expect(screen.getAllByText('骷髅战士').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /attack 4/ })).toBeTruthy()
    expect(screen.getByTestId('asset-preview')).toBeTruthy()
    expect(screen.getByTestId('asset-config-state').textContent).toContain('来源：Manifest')
    expect(screen.getByTestId('asset-config-source').textContent).toContain('Manifest')
    expect(screen.getByText('校验通过')).toBeTruthy()
  })

  it('switches between monster and beast manifest entries and reports missing resources', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: '野兽召唤物' }))

    expect(screen.getAllByText('霜狼').length).toBeGreaterThan(0)
    expect(screen.getAllByText('状态：缺资源').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/素材路径不存在或未接入资源/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('asset-action-slot-idle').textContent).toContain('缺资源')
    expect(screen.getByTestId('asset-preview')).toBeTruthy()
  })

  it('includes skeleton archer and campaign fallback entities in the manageable manifest', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    expect(screen.getAllByText('骷髅弓手').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /骷髅弓手/ }))
    expect(screen.getByRole('button', { name: /cast 4/ })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /hit 4/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /death 4/ }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /吸血鬼仆从/ }))
    expect(screen.getByText(/可配置 fallback 入口/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /skill_1 4/ })).toBeTruthy()
  })

  it('exposes every combat monster archetype, including corrosive slime, as asset-managed entities', () => {
    const managedIds = new Set(developerAssetEntities.map((entity) => entity.id))
    const campaignIds = CAMPAIGN_MONSTER_THEMES.flatMap((theme) => [
      ...theme.normalPool,
      ...theme.elitePool,
      theme.boss,
    ]).map((archetype) => archetype.id)

    expect(managedIds.has(CORROSIVE_SLIME_ARCHETYPE.id)).toBe(true)
    campaignIds.forEach((id) => {
      expect(managedIds.has(id)).toBe(true)
    })
  })

  it('validates anchors for skill actions and opens combat sandbox preview', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /地狱犬/ }))
    fireEvent.click(screen.getByRole('button', { name: /skill_1 6/ }))
    fireEvent.click(screen.getByRole('button', { name: '战斗实测预览' }))

    expect(screen.getByText('火焰吐息')).toBeTruthy()
    expect(screen.getByTestId('anchor-mouth')).toBeTruthy()
    expect(screen.getByTestId('combat-sandbox-preview')).toBeTruthy()
    expect(screen.getByTestId('combat-preview-action').textContent).toContain('火焰吐息')
    expect(screen.getByTestId('projectile-spawn-point')).toBeTruthy()
    expect(screen.getByTestId('skill-range-preview')).toBeTruthy()
  })

  it('marks manual QA checks without treating them as automatic completion', () => {
    const hellhound = cloneDeveloperAssetEntity(developerAssetEntities.find((entity) => entity.id === 'dungeon-hellhound')!)

    expect(validateDeveloperAssetEntity(hellhound).some((issue) => issue.severity === 'manual' && issue.message.includes('需人工 QA'))).toBe(true)
    expect(getDeveloperAssetStatus(hellhound)).toBe('需人工 QA')

    render(<DeveloperAssetPanel onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /地狱犬/ }))

    expect(screen.getByTestId('asset-manual-qa').textContent).toContain('四足剪影需人工 QA')
  })

  it('switches hellhound action slots and updates detail state from idle to move and skill', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /地狱犬/ }))
    fireEvent.click(screen.getByRole('button', { name: /move 6/ }))

    expect(screen.getByRole('heading', { name: '移动' })).toBeTruthy()
    expect((screen.getByLabelText('动作名称') as HTMLInputElement).value).toBe('移动')

    fireEvent.click(screen.getByRole('button', { name: /skill_1 6/ }))

    expect(screen.getByRole('heading', { name: '火焰吐息' })).toBeTruthy()
    expect((screen.getByLabelText('动作名称') as HTMLInputElement).value).toBe('火焰吐息')
    expect((screen.getByLabelText('帧数') as HTMLInputElement).value).toBe('6')
    expect(screen.getByTestId('anchor-mouth')).toBeTruthy()
  })

  it('saves and rolls back draft action settings without touching source assets', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    const fpsInput = screen.getByLabelText('动作 FPS') as HTMLInputElement
    expect(fpsInput.value).toBe('4')

    fireEvent.change(fpsInput, { target: { value: '9' } })
    expect(screen.getByTestId('asset-draft-dirty')).toBeTruthy()
    expect(fpsInput.value).toBe('9')

    fireEvent.click(screen.getByRole('button', { name: '回滚' }))
    expect((screen.getByLabelText('动作 FPS') as HTMLInputElement).value).toBe('4')

    fireEvent.change(screen.getByLabelText('动作 FPS'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: '保存并应用到战斗' }))
    expect(screen.queryByTestId('asset-draft-dirty')).toBeNull()
    expect((screen.getByLabelText('动作 FPS') as HTMLInputElement).value).toBe('10')
  })

  it('lets developers replace action asset paths and preview frames in draft state', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    const assetPathInput = screen.getByLabelText('素材路径') as HTMLInputElement
    const guideFrameInput = screen.getByLabelText('图鉴预览帧路径') as HTMLInputElement
    const frameCountInput = screen.getByLabelText('帧数') as HTMLInputElement

    fireEvent.change(assetPathInput, { target: { value: '/roguelikeGame/assets/monsters/custom/attack_01.png' } })
    fireEvent.change(guideFrameInput, { target: { value: '/roguelikeGame/assets/monsters/custom/attack_01.png' } })
    fireEvent.change(frameCountInput, { target: { value: '6' } })

    expect(assetPathInput.value).toContain('custom/attack_01.png')
    expect(guideFrameInput.value).toContain('custom/attack_01.png')
    expect(frameCountInput.value).toBe('6')
    expect(screen.getByTestId('asset-draft-dirty')).toBeTruthy()
  })

  it('creates editable draft slots for missing monster actions', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /cast 缺动作/ }))

    expect((screen.getByLabelText('动作名称') as HTMLInputElement).value).toBe('施法前摇')
    const assetPathInput = screen.getByLabelText('素材路径') as HTMLInputElement
    fireEvent.change(assetPathInput, { target: { value: '/roguelikeGame/assets/monsters/custom/cast_01.png' } })
    expect(assetPathInput.value).toContain('custom/cast_01.png')
    expect(screen.getByTestId('asset-draft-dirty')).toBeTruthy()
  })

  it('imports action frames by frame count and applies them to runtime combat overrides', async () => {
    stubFileReaderDataUrls()
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    const frameInput = screen.getByLabelText('批量选择动作素材帧') as HTMLInputElement
    const files = [
      new File(['1'], 'attack_01.png', { type: 'image/png' }),
      new File(['2'], 'attack_02.png', { type: 'image/png' }),
      new File(['3'], 'attack_03.png', { type: 'image/png' }),
      new File(['4'], 'attack_04.png', { type: 'image/png' }),
    ]

    fireEvent.change(frameInput, { target: { files } })

    expect(await screen.findByText('需要 4 张；已选 4 张')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '保存并应用到战斗' }))

    const override = getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')
    expect(override?.frameUrls).toEqual([
      'data:image/png;base64,attack_01.png',
      'data:image/png;base64,attack_02.png',
      'data:image/png;base64,attack_03.png',
      'data:image/png;base64,attack_04.png',
    ])
    expect(override?.frameCount).toBe(4)
    expect(override?.combatAction).toBe('attack')
  })

  it('saves action duration and derives combat fps from the requested playback time', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    const durationInput = screen.getByLabelText('动作总时长') as HTMLInputElement

    fireEvent.change(durationInput, { target: { value: '1.6' } })
    fireEvent.click(screen.getByRole('button', { name: '保存并应用到战斗' }))

    const override = getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')
    expect(override?.durationSeconds).toBe(1.6)
    expect(override?.fps).toBe(2.5)
  })

  it('edits and validates hit frames as part of the runtime action config', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    const hitFrameInput = screen.getByLabelText('命中帧') as HTMLInputElement

    expect(hitFrameInput.value).toBe('2')
    fireEvent.change(hitFrameInput, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: '保存并应用到战斗' }))

    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')?.hitFrameIndex).toBe(3)

    fireEvent.change(hitFrameInput, { target: { value: '9' } })
    expect(screen.getByTestId('action-draft-warnings').textContent).toContain('命中帧需在 0-3')
  })

  it('keeps partial single-frame replacement in draft and blocks save until frames are complete', async () => {
    stubFileReaderDataUrls()
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /move 4/ }))
    fireEvent.change(screen.getByLabelText('替换第 2 帧'), {
      target: { files: [new File(['2'], 'move_02.png', { type: 'image/png' })] },
    })

    expect(await screen.findByText('需要 4 张；已选 1 张')).toBeTruthy()
    expect(screen.getAllByText('已配置').length).toBeGreaterThan(0)
    expect(screen.getByTestId('asset-action-slot-move').textContent).toContain('缺帧')
    fireEvent.click(screen.getByRole('button', { name: '保存并应用到战斗' }))

    const override = getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'move')
    expect(screen.getByTestId('asset-project-save-status').textContent).toContain('保存已阻止')
    expect(override).toBeUndefined()
  })

  it('keeps uploaded beast frames as draft when the beast entity still has blocking validation errors', async () => {
    stubFileReaderDataUrls()
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: '野兽召唤物' }))
    fireEvent.click(screen.getByRole('button', { name: /霜狼/ }))
    fireEvent.click(screen.getByRole('button', { name: /move 1/ }))
    fireEvent.change(screen.getByLabelText('替换第 1 帧'), {
      target: { files: [new File(['wolf'], 'wolf_move_01.png', { type: 'image/png' })] },
    })
    await screen.findByText('需要 1 张；已选 1 张')
    fireEvent.click(screen.getByRole('button', { name: '保存并应用到战斗' }))

    expect(screen.getByTestId('asset-project-save-status').textContent).toContain('保存已阻止')
    expect(getRuntimeAssetActionOverride('beast-frost-wolf', 'move')).toBeUndefined()
  })

  it('lets every beast kind expose required action slots for draft replacement', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: '野兽召唤物' }))
    expect(screen.getAllByText('猎鹰').length).toBeGreaterThan(0)
    expect(screen.getAllByText('霜狼').length).toBeGreaterThan(0)
    expect(screen.getAllByText('毒蛇').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /毒蛇/ }))

    expect(screen.getByRole('button', { name: /downed 1/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /revive 1/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /leader 1/ })).toBeTruthy()
  })

  it('warns when uploaded frame count does not match the configured action frame count', async () => {
    stubFileReaderDataUrls()
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    fireEvent.change(screen.getByLabelText('批量选择动作素材帧'), {
      target: { files: [new File(['1'], 'attack_01.png', { type: 'image/png' })] },
    })

    await waitFor(() => expect(screen.getByTestId('action-draft-warnings').textContent).toContain('帧数不匹配'))
  })

  it('marks project actions with missing configured frames as incomplete instead of complete', () => {
    const hellhound = cloneDeveloperAssetEntity(developerAssetEntities.find((entity) => entity.id === 'dungeon-hellhound')!)
    hellhound.actions = hellhound.actions.map((action) => action.slot === 'skill_1'
      ? {
        ...action,
        frameUrls: [
          'assets/developer-assets/dungeon-hellhound/skill_1/frame_01.png',
          'assets/developer-assets/dungeon-hellhound/skill_1/frame_02.png',
        ],
        frameCount: 6,
        exists: true,
      }
      : action)

    const messages = validateDeveloperAssetEntity(hellhound).map((issue) => issue.message)

    expect(messages.some((message) => message.includes('动作帧数量不一致'))).toBe(true)
    expect(messages.some((message) => message.includes('动作缺帧'))).toBe(true)
    expect(getDeveloperAssetStatus(hellhound)).not.toBe('完整')
  })

  it('validates uploaded frame format and dimensions', async () => {
    stubFileReaderDataUrls()
    class MockImage {
      naturalWidth = 32
      naturalHeight = 64
      complete = true
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    vi.stubGlobal('Image', MockImage)
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    fireEvent.change(screen.getByLabelText('替换第 1 帧'), {
      target: { files: [new File(['bad'], 'attack_01.gif', { type: 'image/gif' })] },
    })

    expect((await screen.findAllByText(/格式需为 PNG/)).length).toBeGreaterThan(0)
    expect((await screen.findAllByText(/尺寸不匹配/)).length).toBeGreaterThan(0)
  })

  it('exports saved current entity config as the runtime source for later manifest commits', async () => {
    stubFileReaderDataUrls()
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem, getItem: vi.fn() })
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    fireEvent.change(screen.getByLabelText('批量选择动作素材帧'), {
      target: {
        files: [
          new File(['1'], 'attack_01.png', { type: 'image/png' }),
          new File(['2'], 'attack_02.png', { type: 'image/png' }),
          new File(['3'], 'attack_03.png', { type: 'image/png' }),
          new File(['4'], 'attack_04.png', { type: 'image/png' }),
        ],
      },
    })
    await screen.findByText('需要 4 张；已选 4 张')
    fireEvent.click(screen.getByRole('button', { name: '保存并应用到战斗' }))

    const exported = exportRuntimeAssetDraftConfig()
    expect(exported.entities.some((entity) => entity.entityId === 'dungeon-skeleton-warrior')).toBe(true)
    expect(setItem).toHaveBeenCalled()
    expect((screen.getByTestId('asset-config-export') as HTMLTextAreaElement).value).toContain('dungeon-skeleton-warrior')
    expect((screen.getByTestId('asset-config-export') as HTMLTextAreaElement).value).not.toContain('dungeon-hellhound')
  })

  it('preserves hit frames through export/import draft config', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    fireEvent.change(screen.getByLabelText('命中帧'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: '保存并应用到战斗' }))

    const exported = exportRuntimeAssetDraftConfig()
    expect(exported.entities[0]?.actions.some((action) => action.hitFrameIndex === 1)).toBe(true)

    clearRuntimeAssetOverrides()
    importRuntimeAssetDraftConfig(exported)
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')?.hitFrameIndex).toBe(1)
  })

  it('restores local draft config on mount and applies it to combat overrides', async () => {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-06-24T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-skeleton-warrior',
        actions: [{
          entityId: 'dungeon-skeleton-warrior',
          slot: 'attack',
          combatAction: 'attack',
          frameUrls: ['data:image/png;base64,restored-attack.png'],
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 4,
          fps: 9,
          loop: false,
          hitFrameIndex: 2,
          flipX: true,
          guideFrame: 'data:image/png;base64,restored-attack.png',
          assetPath: 'restored attack draft',
          anchors: { weapon: { x: 0.7, y: 0.4, label: '恢复武器' } },
          combatScale: 1.15,
        }],
      }],
    }))

    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))
    await waitFor(() => expect((screen.getByLabelText('动作 FPS') as HTMLInputElement).value).toBe('9'))
    expect((screen.getByLabelText('命中帧') as HTMLInputElement).value).toBe('2')
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')?.frameUrls[0]).toBe('data:image/png;base64,restored-attack.png')
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')?.combatScale).toBe(1.15)
  })

  it('keeps project config ahead of stale local draft config after restart', async () => {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-06-24T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-skeleton-warrior',
        actions: [{
          entityId: 'dungeon-skeleton-warrior',
          slot: 'attack',
          combatAction: 'attack',
          frameUrls: ['assets/developer-assets/stale-local/attack/frame_01.png'],
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 4,
          fps: 11,
          loop: false,
          hitFrameIndex: 2,
          flipX: true,
          guideFrame: 'assets/developer-assets/stale-local/attack/frame_01.png',
          assetPath: 'stale local draft',
          combatScale: 1,
        }],
      }],
    }))
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        version: 1,
        generatedAt: '2026-06-25T00:00:00.000Z',
        entities: [{
          entityId: 'dungeon-skeleton-warrior',
          actions: [{
            entityId: 'dungeon-skeleton-warrior',
            slot: 'attack',
            combatAction: 'attack',
            frameUrls: ['assets/developer-assets/project/attack/frame_01.png'],
            frameWidth: 64,
            frameHeight: 64,
            frameCount: 4,
            fps: 5,
            loop: false,
            hitFrameIndex: 1,
            flipX: true,
            guideFrame: 'assets/developer-assets/project/attack/frame_01.png',
            assetPath: 'project config',
            combatScale: 1.2,
          }],
        }],
      }),
    })))

    render(<DeveloperAssetPanel onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))

    await waitFor(() => expect((screen.getByLabelText('动作 FPS') as HTMLInputElement).value).toBe('5'))
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')?.frameUrls[0]).toBe('assets/developer-assets/project/attack/frame_01.png')
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')?.combatScale).toBe(1.2)
  })

  it('ignores expired blob draft config because it cannot survive a restart', async () => {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-06-24T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-skeleton-warrior',
        actions: [{
          entityId: 'dungeon-skeleton-warrior',
          slot: 'attack',
          combatAction: 'attack',
          frameUrls: ['blob:expired-attack.png'],
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 4,
          fps: 9,
          loop: false,
          flipX: true,
          guideFrame: 'blob:expired-attack.png',
          combatScale: 1,
        }],
      }],
    }))

    render(<DeveloperAssetPanel onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /attack 4/ }))

    await waitFor(() => expect((screen.getByLabelText('动作 FPS') as HTMLInputElement).value).toBe('8'))
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')).toBeUndefined()
  })

  it('keeps monster and beast previews selectable from the same backend', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    const dialog = screen.getByRole('dialog', { name: '开发者资产管理后台' })
    expect(within(dialog).getAllByText('骷髅战士').length).toBeGreaterThan(0)
    fireEvent.click(within(dialog).getByRole('button', { name: '野兽召唤物' }))
    expect(within(dialog).getAllByText('霜狼').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('战斗比例 1x')).toBeTruthy()
  })
})
