import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cloneDeveloperAssetEntity,
  developerAssetEntities,
  getDeveloperAssetStatus,
  validateDeveloperAssetEntity,
} from '../../game/assetManifest'
import { CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE } from '../../game/campaignMonsters'
import { createInitialSnapshot } from '../../game/engine'
import { HELLHOUND_IMAGE2_ACTIONS, getHellhoundImage2FrameUrls, type HellhoundImage2ActionSlot } from '../../game/hellhoundAssetFrames'
import {
  RUNTIME_ASSET_DRAFT_STORAGE_KEY,
  clearRuntimeAssetOverrides,
  exportRuntimeAssetDraftConfig,
  getRuntimeAssetActionOverride,
  importRuntimeAssetDraftConfig,
  restoreRuntimeAssetOverrideSnapshot,
  setRuntimeAssetActionOverride,
  type RuntimeAssetDraftConfig,
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

let runtimeOverrideSnapshot: RuntimeAssetDraftConfig | undefined
let draftStorageSnapshot: string | null = null

beforeEach(() => {
  runtimeOverrideSnapshot = exportRuntimeAssetDraftConfig()
  draftStorageSnapshot = window.localStorage.getItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)
})

afterEach(() => {
  cleanup()
  restoreRuntimeAssetOverrideSnapshot(runtimeOverrideSnapshot)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (draftStorageSnapshot === null) {
    window.localStorage.removeItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)
  } else {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, draftStorageSnapshot)
  }
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('DeveloperAssetPanel', () => {
  const expectGapField = (entityId: string, slot: string, field: string, value: string) => {
    expect(screen.getByTestId(`asset-gap-${entityId}-${slot}-${field}`).textContent).toContain(value)
  }

  it('shows developer controls only on a local non-production runtime', () => {
    expect(isDeveloperAssetPanelVisible({ DEV: false, PROD: true, MODE: 'production' }, 'localhost')).toBe(false)
    expect(isDeveloperAssetPanelVisible({ DEV: true, PROD: false, MODE: 'development' }, 'dev.example.com')).toBe(false)
    expect(isDeveloperAssetPanelVisible({ DEV: true, PROD: false, MODE: 'development' }, 'localhost')).toBe(true)
    expect(isDeveloperAssetPanelVisible({ DEV: true, PROD: false, MODE: 'development' }, '[::1]')).toBe(true)

    vi.stubGlobal('window', { location: { hostname: 'dev.example.com' } })
    render(<DeveloperAssetPanel onClose={() => undefined} />)
    expect(screen.queryByRole('dialog', { name: '开发者资产管理后台' })).toBeNull()
  })

  it('shows debug toggles, entity actions, preview and validation state', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByLabelText('生命无限'))
    fireEvent.click(screen.getByLabelText('不攻击'))

    expect(useGameStore.getState().debugControls.infiniteHealth).toBe(true)
    expect(useGameStore.getState().debugControls.disableAttacks).toBe(true)
    expect(screen.getAllByText('骷髅战士').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /attack 6/ })).toBeTruthy()
    expect(screen.getByTestId('asset-preview')).toBeTruthy()
    expect(screen.getByTestId('asset-config-state').textContent).toContain('来源：Manifest')
    expect(screen.getByTestId('asset-config-source').textContent).toContain('Manifest')
    expect(screen.getByTestId('asset-selected-identity').textContent).toContain('ID：dungeon-skeleton-warrior')
    expect(screen.getByTestId('asset-selected-identity').textContent).toContain('类型：普通怪')
    expect(screen.getByTestId('asset-coverage-summary').textContent).toContain('普通 / 高威胁 / Boss 护卫候选')
    expect(screen.getByText('校验通过')).toBeTruthy()
  })

  it('uses readable typography for asset management tabs, entity rows, action slots and QA rows', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    expect(screen.getByTestId('developer-tab-assets').className).toContain('text-sm')
    expect(screen.getByTestId('developer-tab-assets').className).not.toContain('text-[8px]')
    expect(screen.getByTestId('asset-category-ordinary').className).toContain('text-sm')
    expect(screen.getByTestId('asset-category-ordinary').className).not.toContain('text-[8px]')
    expect(screen.getByTestId('asset-coverage-summary').className).toContain('text-xs')
    expect(screen.getByTestId('asset-coverage-summary').className).not.toContain('text-[7px]')

    const entityRow = screen.getByTestId('asset-entity-dungeon-skeleton-warrior')
    expect(within(entityRow).getByText('骷髅战士').className).toContain('text-sm')
    expect(within(entityRow).getByText('dungeon-skeleton-warrior').className).toContain('text-xs')
    expect(within(entityRow).getByText(/状态：/).className).toContain('text-xs')

    expect(screen.getByTestId('asset-selected-identity').className).toContain('text-sm')
    expect(screen.getByTestId('asset-selected-identity').className).toContain('break-words')
    expect(screen.getByTestId('asset-action-slot-idle').className).toContain('text-sm')
    expect(screen.getByTestId('asset-slot-qa-state').querySelector('div')?.className).toContain('text-xs')
    expect(screen.getByTestId('asset-config-state').querySelector('div')?.className).toContain('text-sm')
    expect(screen.getByText('校验通过').className).toContain('text-sm')

    const firstGapRow = screen.getByTestId('asset-gap-list').querySelector('[data-testid^="asset-gap-row-"]')
    expect(firstGapRow?.className).toContain('text-xs')
    expect(firstGapRow?.className).not.toContain('text-[7px]')
  })

  it('exposes a dev-only Boss E2E bridge that calls the approved harness and renders summary fields', async () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('developer-tab-boss-e2e'))
    expect(screen.getByTestId('boss-e2e-panel')).toBeTruthy()

    fireEvent.click(screen.getByTestId('boss-e2e-force'))

    await waitFor(() => {
      expect(screen.getByTestId('boss-e2e-summary-campaign').textContent).toContain('1')
      expect(screen.getByTestId('boss-e2e-summary-difficulty').textContent).toContain('normal')
      expect(screen.getByTestId('boss-e2e-summary-floor').textContent).toContain('22')
      expect(screen.getByTestId('boss-e2e-summary-boss-name').textContent).not.toContain('无')
      expect(screen.getByTestId('boss-e2e-summary-boss-present').textContent).toContain('是')
      expect(screen.getByTestId('boss-e2e-summary-boss-hp').textContent).toMatch(/\d+\/\d+/)
      expect(screen.getByTestId('boss-e2e-summary-phase').textContent).toContain('p1')
      expect(screen.getByTestId('boss-e2e-summary-state-phase').textContent).toContain('running')
      expect(screen.getByTestId('boss-e2e-summary-diagnosis').textContent).toContain('Boss E2E 状态有效')
    })
    expect(useGameStore.getState().debugControls.disableAttacks).toBe(true)
    expect(screen.getByTestId('boss-e2e-message').textContent).toContain('不攻击已开启')
    expect(screen.getByTestId('boss-e2e-phase-p2')).toBeTruthy()
    expect(screen.getByTestId('boss-e2e-phase-p3')).toBeTruthy()
    expect(screen.getByTestId('boss-e2e-kill')).toBeTruthy()

    fireEvent.click(screen.getByTestId('boss-e2e-phase-p2'))
    await waitFor(() => expect(screen.getByTestId('boss-e2e-summary-phase').textContent).toContain('p2'))

    fireEvent.click(screen.getByTestId('boss-e2e-phase-p3'))
    await waitFor(() => expect(screen.getByTestId('boss-e2e-summary-phase').textContent).toContain('p3'))

    fireEvent.click(screen.getByTestId('boss-e2e-kill'))
    await waitFor(() => {
      expect(screen.getByTestId('boss-e2e-summary-settlement').textContent).toContain('是')
      expect(screen.getByTestId('boss-e2e-summary-pending-loot').textContent).toContain('是')
    })

    fireEvent.click(screen.getByTestId('boss-e2e-dismiss-loot'))
    await waitFor(() => expect(screen.getByTestId('boss-e2e-summary-pending-loot').textContent).toContain('否'))
    expect(screen.getByTestId('boss-e2e-summary-returned-village').textContent).toContain('否')

    fireEvent.click(screen.getByTestId('boss-e2e-return-village'))
    expect(screen.getByTestId('boss-e2e-message').textContent).toContain('真实回村需使用正式结算按钮')
    expect(screen.getByTestId('boss-e2e-summary-returned-village').textContent).toContain('否')
  })

  it('keeps C2 standard Boss E2E controls and settlement summary readable through kill', async () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('developer-tab-boss-e2e'))
    fireEvent.change(screen.getByTestId('boss-e2e-campaign'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('boss-e2e-player-preset'), { target: { value: 'standard' } })
    fireEvent.click(screen.getByTestId('boss-e2e-force'))

    await waitFor(() => {
      expect(screen.getByTestId('boss-e2e-summary-campaign').textContent).toContain('2')
      expect(screen.getByTestId('boss-e2e-summary-boss-present').textContent).toContain('是')
      expect(screen.getByTestId('boss-e2e-summary-phase').textContent).toContain('p1')
    })

    fireEvent.click(screen.getByTestId('boss-e2e-phase-p2'))
    await waitFor(() => {
      expect(screen.getByTestId('boss-e2e-phase-p2')).toBeTruthy()
      expect(screen.getByTestId('boss-e2e-summary-boss-present').textContent).toContain('是')
      expect(screen.getByTestId('boss-e2e-summary-phase').textContent).toContain('p2')
    })

    fireEvent.click(screen.getByTestId('boss-e2e-phase-p3'))
    await waitFor(() => {
      expect(screen.getByTestId('boss-e2e-phase-p3')).toBeTruthy()
      expect(screen.getByTestId('boss-e2e-summary-boss-present').textContent).toContain('是')
      expect(screen.getByTestId('boss-e2e-summary-phase').textContent).toContain('p3')
    })

    fireEvent.click(screen.getByTestId('boss-e2e-kill'))
    await waitFor(() => {
      expect(screen.getByTestId('boss-e2e-kill')).toBeTruthy()
      expect(screen.getByTestId('boss-e2e-summary-settlement').textContent).toContain('是')
      expect(screen.getByTestId('boss-e2e-summary-pending-loot').textContent).toContain('是')
      const damage = Number(screen.getByTestId('boss-e2e-summary-player-damage').textContent?.match(/(\d+) 伤害/)?.[1] ?? 0)
      expect(damage).toBeGreaterThan(0)
      expect(screen.getByTestId('boss-e2e-summary-diagnosis').textContent).toContain('Boss 已击杀')
    })
  })

  it('exposes a dev-only Talent E2E bridge with unlock, Lv5 candidate and consumption evidence', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('developer-tab-talent-e2e'))
    expect(screen.getByTestId('talent-e2e-panel')).toBeTruthy()

    fireEvent.click(screen.getByTestId('talent-e2e-fixture'))
    expect(screen.getByTestId('talent-e2e-summary-balance').textContent).toContain('20')
    expect(screen.getByTestId('talent-e2e-summary-ledger').textContent).toContain('campaign-clear')
    expect(screen.getByTestId('talent-e2e-summary-storage').textContent).toContain('未污染')

    fireEvent.click(screen.getByTestId('talent-e2e-unlock-01'))
    expect(screen.getByTestId('talent-e2e-summary-meta-count').textContent).toContain('1/84')
    fireEvent.click(screen.getByTestId('talent-e2e-unlock-02'))
    expect(screen.getByTestId('talent-e2e-summary-balance').textContent).toContain('17')
    expect(screen.getByTestId('talent-e2e-summary-meta-count').textContent).toContain('2/84')

    fireEvent.click(screen.getByTestId('talent-e2e-generate'))
    expect(screen.getByTestId('talent-e2e-summary-run-candidates').textContent).toContain('Lv5 魂爆初醒')
    expect(screen.getByTestId('talent-e2e-summary-run-guaranteed').textContent).toContain('run_death_05')

    fireEvent.click(screen.getByTestId('talent-e2e-reroll'))
    expect(screen.getByTestId('talent-e2e-summary-run-guaranteed').textContent).toContain('run_death_05')

    fireEvent.click(screen.getByTestId('talent-e2e-select'))
    expect(screen.getByTestId('talent-e2e-summary-run-selected').textContent).not.toContain('无')

    fireEvent.click(screen.getByTestId('talent-e2e-consumption'))
    expect(screen.getByTestId('talent-e2e-summary-pickup-multiplier').textContent).toMatch(/1\./)
    expect(screen.getByTestId('talent-e2e-summary-pickup-final').textContent).toContain('140 / cap 140')
    expect(screen.getByTestId('talent-e2e-summary-pickup-health').textContent).toContain('否')
    expect(screen.getByTestId('talent-e2e-summary-auto-multiplier').textContent).toContain('1.08')
    expect(screen.getByTestId('talent-e2e-summary-auto-base').textContent).toContain('crystalDust:56')
    expect(screen.getByTestId('talent-e2e-summary-auto-final').textContent).toContain('crystalDust:60')
    expect(screen.getByTestId('talent-e2e-summary-auto-final').textContent).toContain('buildShard:17')
    expect(screen.getByTestId('talent-e2e-summary-storage').textContent).toContain('未污染')
    expect(screen.getByTestId('talent-e2e-summary-console').textContent).toContain('无')
  })

  it('prepares dev-only reforge QA fixtures with documented resources and old roll coverage', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('developer-tab-reforge-qa'))
    expect(screen.getByTestId('reforge-qa-panel')).toBeTruthy()

    fireEvent.click(screen.getByTestId('reforge-qa-secondary-success'))
    expect(screen.getByTestId('reforge-qa-message').textContent).toContain('qa-secondary-old-roll-epic')
    expect(useGameStore.getState().currency).toBe(500)
    expect(useGameStore.getState().equipmentMaterials.refinedIron).toBe(6)
    expect(useGameStore.getState().equipmentMaterials.crystalDust).toBe(18)
    expect(useGameStore.getState().equipmentMaterials.buildRune).toBe(1)
    expect(useGameStore.getState().equipmentInventory[0].rolls).toBeUndefined()
    expect(useGameStore.getState().equipmentInventory[0].lockedModifierIndexes).toEqual([0])

    fireEvent.click(screen.getByTestId('reforge-qa-boss-success'))
    expect(screen.getByTestId('reforge-qa-message').textContent).toContain('qa-boss-old-roll-legacy')
    expect(useGameStore.getState().currency).toBe(1000)
    expect(useGameStore.getState().equipmentMaterials.buildRune).toBe(2)
    expect(useGameStore.getState().equipmentMaterials.skillPage).toBe(2)
    expect(useGameStore.getState().equipmentMaterials.legacyEmber).toBe(2)
    expect(useGameStore.getState().equipmentMaterials.campaignSigil).toBe(2)
    expect(useGameStore.getState().equipmentInventory[0].rolls).toBeUndefined()
  })

  it('switches between monster and beast manifest entries and reports missing resources', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: '野兽召唤物' }))

    expect(screen.getAllByText('霜狼').length).toBeGreaterThan(0)
    expect(screen.getAllByText('状态：配置来源缺失').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/素材路径不存在或未接入资源/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('asset-action-slot-idle').textContent).toContain('配置来源缺失')
    expect(screen.getByTestId('asset-preview')).toBeTruthy()
  })

  it('shows the skeleton warrior PT action slots and keeps unrelated real gaps structured', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    expect(screen.getByRole('button', { name: /attack 6/ }).textContent).toContain('完整')
    expect(screen.getByRole('button', { name: /move 8/ }).textContent).toContain('完整')
    expect(screen.getByRole('button', { name: /skill_1 1/ }).textContent).toContain('完整')
    expect(screen.getByRole('button', { name: /skill_2 7/ }).textContent).toContain('完整')
    expect(screen.getByTestId('asset-gap-row-dungeon-skeleton-warrior-cast')).toBeTruthy()
    expect(screen.queryByTestId('asset-gap-row-dungeon-skeleton-warrior-attack')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '野兽召唤物' }))
    fireEvent.click(screen.getByTestId('asset-entity-beast-frost-wolf'))

    const gapListText = screen.getByTestId('asset-gap-list').textContent ?? ''
    expect(screen.getByTestId('asset-gap-row-beast-frost-wolf-idle')).toBeTruthy()
    expectGapField('beast-frost-wolf', 'idle', 'entity-id', 'beast-frost-wolf')
    expectGapField('beast-frost-wolf', 'idle', 'entity-name', '霜狼')
    expectGapField('beast-frost-wolf', 'idle', 'entity-type', '野兽召唤物')
    expectGapField('beast-frost-wolf', 'idle', 'slot', 'idle')
    expectGapField('beast-frost-wolf', 'idle', 'status', '配置来源缺失')
    expectGapField('beast-frost-wolf', 'idle', 'current-frames', '0')
    expectGapField('beast-frost-wolf', 'idle', 'target-frames', '1')
    expectGapField('beast-frost-wolf', 'idle', 'source', 'Manifest')
    expectGapField('beast-frost-wolf', 'idle', 'reason', '素材路径未接入')
    expectGapField('beast-frost-wolf', 'idle', 'impact-surface', '战斗渲染、图鉴预览、资产后台预览、战斗实测预览')
    expectGapField('beast-frost-wolf', 'idle', 'impact-level', '影响关键战斗')
    expectGapField('beast-frost-wolf', 'idle', 'blocks-talent', '否')
    expectGapField('beast-frost-wolf', 'idle', 'owner', 'UI / 数据结构 / 配置线程')
    expect(gapListText).not.toContain('阻断该动作完整状态')
    expect(gapListText).not.toContain('非必填动作不完整')
    expect(gapListText).not.toContain('待统筹确认')
  })

  it('renders split fields for missing-frame rows restored from runtime config', async () => {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-06-24T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-skeleton-warrior',
        actions: [{
          entityId: 'dungeon-skeleton-warrior',
          slot: 'attack',
          combatAction: 'attack',
          frameUrls: ['assets/developer-assets/project/attack/frame_01.png'],
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 6,
          fps: 8,
          loop: false,
          flipX: true,
          guideFrame: 'assets/developer-assets/project/attack/frame_01.png',
          assetPath: 'partial attack config',
          combatScale: 1,
        }],
      }],
    }))

    render(<DeveloperAssetPanel onClose={() => undefined} />)

    await waitFor(() => expect(screen.getByTestId('asset-gap-row-dungeon-skeleton-warrior-attack')).toBeTruthy())
    expectGapField('dungeon-skeleton-warrior', 'attack', 'entity-id', 'dungeon-skeleton-warrior')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'entity-name', '骷髅战士')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'entity-type', '普通怪')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'slot', 'attack')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'status', '缺帧')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'current-frames', '1')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'target-frames', '6')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'source', '草稿')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'reason', '1/6')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'impact-surface', '资产后台预览')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'impact-level', '影响辨识')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'blocks-talent', '否')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'owner', 'UI / 数据结构 / 配置线程')
  })

  it('includes skeleton archer and campaign fallback entities in the manageable manifest', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    expect(screen.getAllByText('骷髅弓手').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /骷髅弓手/ }))
    expect(screen.getByRole('button', { name: /attack 15/ })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /hit 2/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /death 5/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /cast 缺动作/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /skill_1 缺动作/ })).toBeTruthy()

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

  it('keeps all backend entity categories and Boss guard candidates covered by documented status labels', () => {
    const allowedStatuses = new Set(['完整', '缺帧', '缺动作', '待人工验收', '草稿未保存', '配置来源缺失'])
    const entityById = new Map(developerAssetEntities.map((entity) => [entity.id, entity]))
    const guardCandidateIds = CAMPAIGN_MONSTER_THEMES.flatMap((theme) => theme.normalPool.map((archetype) => archetype.id))

    expect(developerAssetEntities.some((entity) => entity.category === 'ordinary')).toBe(true)
    expect(developerAssetEntities.some((entity) => entity.category === 'elite')).toBe(true)
    expect(developerAssetEntities.some((entity) => entity.category === 'boss')).toBe(true)
    expect(developerAssetEntities.some((entity) => entity.category === 'beast')).toBe(true)
    guardCandidateIds.forEach((id) => {
      expect(entityById.get(id)?.category).toBe('ordinary')
    })
    developerAssetEntities.forEach((entity) => {
      expect(allowedStatuses.has(getDeveloperAssetStatus(entity))).toBe(true)
    })

    render(<DeveloperAssetPanel onClose={() => undefined} />)
    expect(screen.getByTestId('asset-entity-dungeon-skeleton-warrior')).toBeTruthy()
    fireEvent.click(screen.getByTestId('asset-category-elite'))
    expect(screen.getByTestId('asset-entity-dungeon-chain-captain')).toBeTruthy()
    fireEvent.click(screen.getByTestId('asset-category-boss'))
    expect(screen.getByTestId('asset-entity-dungeon-warden')).toBeTruthy()
    fireEvent.click(screen.getByTestId('asset-category-beast'))
    expect(screen.getByTestId('asset-entity-beast-frost-wolf')).toBeTruthy()
    fireEvent.click(screen.getByTestId('asset-entity-beast-frost-wolf'))
    expect(screen.getByTestId('asset-gap-row-beast-frost-wolf-idle')).toBeTruthy()
  })

  it('validates anchors for skill actions and opens combat sandbox preview', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /地狱犬/ }))
    fireEvent.click(screen.getByRole('button', { name: /skill_1 3/ }))
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

    expect(validateDeveloperAssetEntity(hellhound).some((issue) => issue.severity === 'manual' && issue.message.includes('待人工验收'))).toBe(true)
    expect(getDeveloperAssetStatus(hellhound)).toBe('待人工验收')

    render(<DeveloperAssetPanel onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /地狱犬/ }))

    expect(screen.getByTestId('asset-manual-qa').textContent).toContain('四足剪影待人工验收')
  })

  it('wires every hellhound asset-management action to hellhound-image2 frames', () => {
    const hellhound = developerAssetEntities.find((entity) => entity.id === 'dungeon-hellhound')
    const actionsBySlot = new Map(hellhound?.actions.map((action) => [action.slot, action]))
    const hellhoundSlots = Object.keys(HELLHOUND_IMAGE2_ACTIONS) as HellhoundImage2ActionSlot[]

    hellhoundSlots.forEach((slot) => {
      const action = actionsBySlot.get(slot)
      expect(action?.frameUrls).toEqual(getHellhoundImage2FrameUrls(slot).map((path) => `/${path}`))
      expect(action?.assetPath).toContain('assets/monsters/hellhound-image2')
      expect(action?.assetPath).not.toContain('assets/developer-assets/dungeon-hellhound')
      expect(action?.assetPath).not.toContain('hellhound-sheet.png')
      expect(action?.frameWidth).toBe(192)
      expect(action?.frameHeight).toBe(192)
      expect(action?.flipX).toBe(false)
    })
  })

  it('switches hellhound action slots and updates detail state from idle to move and skill', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /地狱犬/ }))
    fireEvent.click(screen.getByRole('button', { name: /move 6/ }))

    expect(screen.getByRole('heading', { name: '移动' })).toBeTruthy()
    expect((screen.getByLabelText('动作名称') as HTMLInputElement).value).toBe('移动')

    fireEvent.click(screen.getByRole('button', { name: /skill_1 3/ }))

    expect(screen.getByRole('heading', { name: '火焰吐息' })).toBeTruthy()
    expect((screen.getByLabelText('动作名称') as HTMLInputElement).value).toBe('火焰吐息')
    expect((screen.getByLabelText('帧数') as HTMLInputElement).value).toBe('3')
    expect(screen.getByTestId('anchor-mouth')).toBeTruthy()
  })

  it('saves and rolls back draft action settings without touching source assets', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    const fpsInput = screen.getByLabelText('动作 FPS') as HTMLInputElement
    expect(fpsInput.value).toBe('14.29')

    fireEvent.change(fpsInput, { target: { value: '9' } })
    expect(screen.getByTestId('asset-draft-dirty')).toBeTruthy()
    expect(fpsInput.value).toBe('9')

    fireEvent.click(screen.getByTestId('asset-rollback-draft'))
    expect((screen.getByLabelText('动作 FPS') as HTMLInputElement).value).toBe('14.29')

    fireEvent.change(screen.getByLabelText('动作 FPS'), { target: { value: '10' } })
    fireEvent.click(screen.getByTestId('asset-save-draft'))
    expect(screen.queryByTestId('asset-draft-dirty')).toBeNull()
    expect((screen.getByLabelText('动作 FPS') as HTMLInputElement).value).toBe('10')
  })

  it('lets developers replace action asset paths and preview frames in draft state', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
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

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    const frameInput = screen.getByLabelText('批量选择动作素材帧') as HTMLInputElement
    const files = [
      new File(['1'], 'attack_01.png', { type: 'image/png' }),
      new File(['2'], 'attack_02.png', { type: 'image/png' }),
      new File(['3'], 'attack_03.png', { type: 'image/png' }),
      new File(['4'], 'attack_04.png', { type: 'image/png' }),
      new File(['5'], 'attack_05.png', { type: 'image/png' }),
      new File(['6'], 'attack_06.png', { type: 'image/png' }),
    ]

    fireEvent.change(frameInput, { target: { files } })

    expect(await screen.findByText('需要 6 张；已选 6 张')).toBeTruthy()
    fireEvent.click(screen.getByTestId('asset-save-draft'))

    const override = getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')
    expect(override?.frameUrls).toEqual([
      'data:image/png;base64,attack_01.png',
      'data:image/png;base64,attack_02.png',
      'data:image/png;base64,attack_03.png',
      'data:image/png;base64,attack_04.png',
      'data:image/png;base64,attack_05.png',
      'data:image/png;base64,attack_06.png',
    ])
    expect(override?.frameCount).toBe(6)
    expect(override?.combatAction).toBe('attack')
  })

  it('saves action duration and derives combat fps from the requested playback time', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    const durationInput = screen.getByLabelText('动作总时长') as HTMLInputElement

    fireEvent.change(durationInput, { target: { value: '1.6' } })
    fireEvent.click(screen.getByTestId('asset-save-draft'))

    const override = getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')
    expect(override?.durationSeconds).toBe(1.6)
    expect(override?.fps).toBe(3.75)
  })

  it('saves a valid current action flip without blocking on unrelated missing frames', async () => {
    const makeHellhoundAction = (slot: 'idle' | 'skill_1', frames: number, frameCount = slot === 'idle' ? 7 : 3) => ({
      entityId: 'dungeon-hellhound',
      slot,
      combatAction: slot === 'skill_1' ? 'skill' : slot,
      frameUrls: getHellhoundImage2FrameUrls(slot).slice(0, frames),
      frameWidth: 192,
      frameHeight: 192,
      frameCount,
      fps: 8,
      loop: slot === 'idle',
      flipX: false,
      guideFrame: getHellhoundImage2FrameUrls(slot)[0],
      assetPath: getHellhoundImage2FrameUrls(slot).slice(0, frames).join(' / '),
      combatScale: 1,
    })
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-07-04T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-hellhound',
        actions: [
          makeHellhoundAction('idle', 7),
          makeHellhoundAction('skill_1', 2),
        ],
      }],
    }))

    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(await screen.findByTestId('asset-entity-dungeon-hellhound'))
    expect(screen.getByTestId('asset-gap-row-dungeon-hellhound-skill_1')).toBeTruthy()
    expectGapField('dungeon-hellhound', 'skill_1', 'status', '缺帧')
    expectGapField('dungeon-hellhound', 'skill_1', 'current-frames', '2')
    expectGapField('dungeon-hellhound', 'skill_1', 'target-frames', '3')

    const flipInput = screen.getByLabelText('是否左右翻转') as HTMLInputElement
    expect(flipInput.checked).toBe(false)
    fireEvent.click(flipInput)
    expect(flipInput.checked).toBe(true)
    fireEvent.click(screen.getByTestId('asset-save-draft'))

    await waitFor(() => {
      expect(screen.getByTestId('asset-project-save-status').textContent).not.toContain('保存已阻止')
      expect(screen.getByTestId('asset-project-save-status').textContent).toContain('已保存当前动作')
    })
    expect(getRuntimeAssetActionOverride('dungeon-hellhound', 'idle')?.flipX).toBe(true)
    expect(getRuntimeAssetActionOverride('dungeon-hellhound', 'skill')?.frameUrls).toHaveLength(2)
    const saved = JSON.parse(window.localStorage.getItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY) ?? '{}')
    const idle = saved.entities[0].actions.find((action: { slot: string }) => action.slot === 'idle')
    expect(idle.flipX).toBe(true)
    expect(idle.frameUrls).toHaveLength(7)
    expect(screen.getByTestId('asset-gap-row-dungeon-hellhound-skill_1')).toBeTruthy()
  })

  it('keeps existing user runtime overrides when saving another action and reloading the draft', async () => {
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: getHellhoundImage2FrameUrls('idle'),
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 7,
      fps: 8,
      durationSeconds: 0.75,
      loop: true,
      flipX: true,
      guideFrame: getHellhoundImage2FrameUrls('idle')[0],
      assetPath: getHellhoundImage2FrameUrls('idle').join(' / '),
      combatScale: 1,
    })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    fireEvent.change(screen.getByLabelText('动作 FPS'), { target: { value: '11' } })
    fireEvent.click(screen.getByTestId('asset-save-draft'))

    await waitFor(() => {
      expect(screen.getByTestId('asset-project-save-status').textContent).toContain('当前环境未写入项目文件')
    })
    expect(fetchSpy).not.toHaveBeenCalledWith('/__roguelike-asset-config', expect.anything())

    const saved = JSON.parse(window.localStorage.getItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY) ?? '{}') as {
      entities: Array<{ entityId: string; actions: Array<{ slot: string; flipX?: boolean; fps?: number }> }>
    }
    const hellhound = saved.entities.find((entity) => entity.entityId === 'dungeon-hellhound')
    const skeleton = saved.entities.find((entity) => entity.entityId === 'dungeon-skeleton-warrior')
    expect(hellhound?.actions.find((action) => action.slot === 'idle')?.flipX).toBe(true)
    expect(skeleton?.actions.find((action) => action.slot === 'attack')?.fps).toBe(11)

    clearRuntimeAssetOverrides()
    importRuntimeAssetDraftConfig(saved as RuntimeAssetDraftConfig)
    expect(getRuntimeAssetActionOverride('dungeon-hellhound', 'idle')?.flipX).toBe(true)
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')?.fps).toBe(11)
  })

  it('ignores legacy hellhound draft paths so removed assets do not hide hellhound-image2', () => {
    importRuntimeAssetDraftConfig({
      version: 1,
      generatedAt: '2026-07-09T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-hellhound',
        actions: [{
          entityId: 'dungeon-hellhound',
          slot: 'idle',
          combatAction: 'idle',
          frameUrls: ['assets/developer-assets/dungeon-hellhound/idle/frame_01.png'],
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 1,
          fps: 6,
          loop: true,
          flipX: false,
          guideFrame: 'assets/monsters/hellhound-preview.png',
          assetPath: 'assets/monsters/hellhound-sheet.png',
          combatScale: 1,
        }],
      }],
    })

    expect(getRuntimeAssetActionOverride('dungeon-hellhound', 'idle')).toBeUndefined()
  })

  it('shows user runtime overrides before manifest defaults for hellhound actions', async () => {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-07-04T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-hellhound',
        actions: [{
          entityId: 'dungeon-hellhound',
          slot: 'idle',
          combatAction: 'idle',
          frameUrls: getHellhoundImage2FrameUrls('idle'),
          frameWidth: 192,
          frameHeight: 192,
          frameCount: 7,
          fps: 8,
          durationSeconds: 0.75,
          loop: true,
          flipX: true,
          guideFrame: getHellhoundImage2FrameUrls('idle')[0],
          assetPath: getHellhoundImage2FrameUrls('idle').join(' / '),
          combatScale: 1,
        }],
      }],
    }))

    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(await screen.findByTestId('asset-entity-dungeon-hellhound'))
    expect((screen.getByLabelText('是否左右翻转') as HTMLInputElement).checked).toBe(true)
  })

  it('edits and validates hit frames as part of the runtime action config', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    const hitFrameInput = screen.getByLabelText('命中帧') as HTMLInputElement

    expect(hitFrameInput.value).toBe('4')
    fireEvent.change(hitFrameInput, { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('asset-save-draft'))

    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')?.hitFrameIndex).toBe(3)

    fireEvent.change(hitFrameInput, { target: { value: '9' } })
    expect(screen.getByTestId('action-draft-warnings').textContent).toContain('命中帧需在 0-5')
  })

  it('keeps partial frame imports in draft and blocks save until frames are complete', async () => {
    stubFileReaderDataUrls()
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /move 8/ }))
    fireEvent.change(screen.getByLabelText('批量选择动作素材帧'), {
      target: { files: [new File(['2'], 'move_02.png', { type: 'image/png' })] },
    })

    expect(await screen.findByText('需要 8 张；已选 1 张')).toBeTruthy()
    expect(screen.getAllByText('已配置').length).toBeGreaterThan(0)
    expect(screen.getByTestId('asset-action-slot-move').textContent).toContain('缺帧')
    fireEvent.click(screen.getByTestId('asset-save-draft'))

    const override = getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'move')
    expect(screen.getByTestId('asset-project-save-status').textContent).toContain('保存已阻止')
    expect(override).toBeUndefined()
  })

  it('keeps insufficient uploaded frames as a dirty draft without marking the action complete or writing runtime config before save', async () => {
    stubFileReaderDataUrls()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    fireEvent.change(screen.getByLabelText('批量选择动作素材帧'), {
      target: { files: [new File(['1'], 'attack_01.png', { type: 'image/png' })] },
    })

    expect(await screen.findByText('需要 6 张；已选 1 张')).toBeTruthy()
    expect(screen.getByTestId('asset-draft-dirty')).toBeTruthy()
    expect(screen.getByTestId('asset-action-slot-attack').textContent).toContain('缺帧')
    expect(screen.getByTestId('asset-gap-row-dungeon-skeleton-warrior-attack')).toBeTruthy()
    expectGapField('dungeon-skeleton-warrior', 'attack', 'current-frames', '1')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'target-frames', '6')
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')).toBeUndefined()
    expect(window.localStorage.getItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)).toBeNull()
    expect(setItemSpy).not.toHaveBeenCalledWith(RUNTIME_ASSET_DRAFT_STORAGE_KEY, expect.any(String))
    expect(fetchSpy).not.toHaveBeenCalledWith('/__roguelike-asset-config', expect.anything())

    fireEvent.click(screen.getByTestId('asset-save-draft'))

    expect(screen.getByTestId('asset-project-save-status').textContent).toContain('保存已阻止')
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')).toBeUndefined()
    expect(window.localStorage.getItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalledWith('/__roguelike-asset-config', expect.anything())
  })

  it('keeps a full frame upload in complete dirty draft state without polluting runtime or project assets until save', async () => {
    stubFileReaderDataUrls()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    fireEvent.change(screen.getByLabelText('批量选择动作素材帧'), {
      target: {
        files: [
          new File(['1'], 'attack_01.png', { type: 'image/png' }),
          new File(['2'], 'attack_02.png', { type: 'image/png' }),
          new File(['3'], 'attack_03.png', { type: 'image/png' }),
          new File(['4'], 'attack_04.png', { type: 'image/png' }),
          new File(['5'], 'attack_05.png', { type: 'image/png' }),
          new File(['6'], 'attack_06.png', { type: 'image/png' }),
        ],
      },
    })

    expect(await screen.findByText('需要 6 张；已选 6 张')).toBeTruthy()
    expect(screen.getByTestId('asset-draft-dirty')).toBeTruthy()
    expect(screen.getByTestId('asset-action-slot-attack').textContent).toContain('草稿未保存')
    expect(screen.getByTestId('asset-gap-row-dungeon-skeleton-warrior-attack')).toBeTruthy()
    expectGapField('dungeon-skeleton-warrior', 'attack', 'status', '草稿未保存')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'current-frames', '6')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'target-frames', '6')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'reason', '当前实体存在未保存修改')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'impact-level', '不影响流程')
    expectGapField('dungeon-skeleton-warrior', 'attack', 'blocks-talent', '否')
    expect(screen.getByTestId('asset-config-source').textContent).toContain('草稿未保存')
    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'attack')).toBeUndefined()
    expect(window.localStorage.getItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)).toBeNull()
    expect(setItemSpy).not.toHaveBeenCalledWith(RUNTIME_ASSET_DRAFT_STORAGE_KEY, expect.any(String))
    expect(fetchSpy).not.toHaveBeenCalledWith('/__roguelike-asset-config', expect.anything())
  })

  it('saves an uploaded beast current action while the rest of the entity stays incomplete', async () => {
    stubFileReaderDataUrls()
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: '野兽召唤物' }))
    fireEvent.click(screen.getByRole('button', { name: /霜狼/ }))
    fireEvent.click(screen.getByRole('button', { name: /move 1/ }))
    fireEvent.change(screen.getByLabelText('替换第 1 帧'), {
      target: { files: [new File(['wolf'], 'wolf_move_01.png', { type: 'image/png' })] },
    })
    await screen.findByText('需要 1 张；已选 1 张')
    fireEvent.click(screen.getByTestId('asset-save-draft'))

    await waitFor(() => {
      expect(screen.getByTestId('asset-project-save-status').textContent).not.toContain('保存已阻止')
      expect(screen.getByTestId('asset-project-save-status').textContent).toContain('已保存当前动作')
    })
    expect(getRuntimeAssetActionOverride('beast-frost-wolf', 'move')?.frameUrls).toEqual(['data:image/png;base64,wolf_move_01.png'])
    expect(screen.getByTestId('asset-gap-row-beast-frost-wolf-idle')).toBeTruthy()
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

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
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
        frameUrls: getHellhoundImage2FrameUrls('skill_1').slice(0, 2),
        frameCount: 3,
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

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    fireEvent.change(screen.getByLabelText('替换第 1 帧'), {
      target: { files: [new File(['bad'], 'attack_01.gif', { type: 'image/gif' })] },
    })

    await waitFor(() => {
      expect(screen.queryAllByText(/格式需为 PNG/).length).toBeGreaterThan(0)
      expect(screen.queryAllByText(/尺寸不匹配/).length).toBeGreaterThan(0)
    }, { timeout: 10000 })
  })

  it('refreshes uploaded frame validation when action frame dimensions change', async () => {
    stubFileReaderDataUrls()
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', {
      setItem,
      getItem: vi.fn(),
      removeItem: vi.fn(),
    })
    class MockImage {
      naturalWidth = 192
      naturalHeight = 192
      complete = true
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    vi.stubGlobal('Image', MockImage)
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('asset-entity-dungeon-hellhound'))
    fireEvent.click(screen.getByRole('button', { name: /idle 7/ }))
    fireEvent.change(screen.getByLabelText('批量选择动作素材帧'), {
      target: {
        files: Array.from({ length: 7 }, (_, index) => (
          new File([String(index)], `idle_${index + 1}.png`, { type: 'image/png' })
        )),
      },
    })

    await waitFor(() => {
      expect(screen.queryByText('尺寸不匹配：需要 192x192，当前 192x192')).toBeNull()
    }, { timeout: 10000 })

    fireEvent.change(screen.getByLabelText('帧宽'), { target: { value: '64' } })
    fireEvent.change(screen.getByLabelText('帧高'), { target: { value: '64' } })

    await waitFor(() => {
      expect(screen.queryAllByText('尺寸不匹配：需要 64x64，当前 192x192').length).toBeGreaterThan(0)
    })

    fireEvent.change(screen.getByLabelText('帧宽'), { target: { value: '192' } })
    fireEvent.change(screen.getByLabelText('帧高'), { target: { value: '192' } })

    await waitFor(() => {
      expect(screen.queryByText('尺寸不匹配：需要 64x64，当前 192x192')).toBeNull()
    })

    fireEvent.click(screen.getByTestId('asset-save-draft'))
    await waitFor(() => {
      expect(screen.getByTestId('asset-project-save-status').textContent).not.toContain('需要 64x64')
      expect(setItem).toHaveBeenCalled()
    })

    const exported = JSON.parse((screen.getByTestId('asset-config-export') as HTMLTextAreaElement).value)
    const idle = exported.entities[0].actions.find((action: { slot: string }) => action.slot === 'idle')
    expect(idle.frameWidth).toBe(192)
    expect(idle.frameHeight).toBe(192)
    expect((screen.getByTestId('asset-config-export') as HTMLTextAreaElement).value).not.toContain('需要 64x64')

    fireEvent.change(screen.getByLabelText('帧宽'), { target: { value: '64' } })
    fireEvent.change(screen.getByLabelText('帧高'), { target: { value: '64' } })

    await waitFor(() => {
      expect(screen.queryAllByText('尺寸不匹配：需要 64x64，当前 192x192').length).toBeGreaterThan(0)
    })
  })

  it('exports saved current entity config as the runtime source for later manifest commits', async () => {
    stubFileReaderDataUrls()
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem, getItem: vi.fn() })
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    fireEvent.change(screen.getByLabelText('批量选择动作素材帧'), {
      target: {
        files: [
          new File(['1'], 'attack_01.png', { type: 'image/png' }),
          new File(['2'], 'attack_02.png', { type: 'image/png' }),
          new File(['3'], 'attack_03.png', { type: 'image/png' }),
          new File(['4'], 'attack_04.png', { type: 'image/png' }),
          new File(['5'], 'attack_05.png', { type: 'image/png' }),
          new File(['6'], 'attack_06.png', { type: 'image/png' }),
        ],
      },
    })
    await screen.findByText('需要 6 张；已选 6 张')
    fireEvent.click(screen.getByTestId('asset-save-draft'))

    const exported = exportRuntimeAssetDraftConfig()
    expect(exported.entities.some((entity) => entity.entityId === 'dungeon-skeleton-warrior')).toBe(true)
    expect(setItem).toHaveBeenCalled()
    expect((screen.getByTestId('asset-config-export') as HTMLTextAreaElement).value).toContain('dungeon-skeleton-warrior')
    expect((screen.getByTestId('asset-config-export') as HTMLTextAreaElement).value).not.toContain('dungeon-hellhound')
  })

  it('exports the dungeon warden frame manifest without falling back to the old boss sheet', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByTestId('asset-category-boss'))
    fireEvent.click(screen.getByTestId('asset-entity-dungeon-warden'))
    fireEvent.click(screen.getByRole('button', { name: /attack 8/ }))
    fireEvent.change(screen.getByLabelText('动作 FPS'), { target: { value: '9' } })
    fireEvent.click(screen.getByTestId('asset-export-current-entity'))

    const exported = JSON.parse((screen.getByTestId('asset-config-export') as HTMLTextAreaElement).value)
    const attack = exported.entities[0].actions.find((action: { slot: string }) => action.slot === 'attack')
    expect(attack.frameUrls).toHaveLength(8)
    expect(attack.assetPath).toContain('assets/monsters/dungeon-warden/Attack/Attack1-1@3x.png')
    expect(attack.guideFrame).toContain('assets/monsters/dungeon-warden/Attack/Attack1-1@3x.png')
    expect(attack.fps).toBe(9)
  })

  it('preserves hit frames through export/import draft config', () => {
    render(<DeveloperAssetPanel onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))
    fireEvent.change(screen.getByLabelText('命中帧'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('asset-save-draft'))

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

    fireEvent.click(await screen.findByRole('button', { name: /attack 4/ }))
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
    fireEvent.click(await screen.findByRole('button', { name: /attack 4/ }))

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
    fireEvent.click(screen.getByRole('button', { name: /attack 6/ }))

    await waitFor(() => expect((screen.getByLabelText('动作 FPS') as HTMLInputElement).value).toBe('14.29'))
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
