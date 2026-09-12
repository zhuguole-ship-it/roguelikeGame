import { useState } from 'react'

import {
  getFirstDungeonGodotTerrainRendererNativeObservation,
  type FirstDungeonGodotTerrainRendererNativeObservation,
} from '../../game/firstDungeonGodotTerrainRenderer'

type FirstDungeonChunkObservabilityPanelProps = {
  onClose: () => void
}

const formatDuration = (value: number) => `${value.toFixed(2)} ms`

const formatRange = (range: { startX: number; startY: number; endX: number; endY: number }) => (
  `(${range.startX}, ${range.startY}) → (${range.endX}, ${range.endY})`
)

const formatCamera = (camera: { x: number; y: number }) => `(${camera.x}, ${camera.y})`

const resourceValidationLabel = (validation: FirstDungeonGodotTerrainRendererNativeObservation['resource']['validation']) => ({
  pending: '待验证',
  passed: '已验证',
  failed: '验证失败',
})[validation]

/**
 * Local-development, renderer-native observation only. Refreshing only rereads
 * A1's immutable renderer observation; it has no simulation, Store, persistence,
 * browser-exposed API, or browser configuration side effect.
 */
export function FirstDungeonChunkObservabilityPanel({ onClose }: FirstDungeonChunkObservabilityPanelProps) {
  const [, setRefreshRevision] = useState(0)
  const [feedback, setFeedback] = useState('')
  const observation = getFirstDungeonGodotTerrainRendererNativeObservation()

  // The getter owns the single localhost-development guard. A production or
  // remote-development runtime returns null before this component mounts UI.
  if (!observation) return null

  const refreshObservation = () => {
    setRefreshRevision((revision) => revision + 1)
    setFeedback('已重新读取 renderer 原生观测；未触发模拟或场景切换。')
  }

  const resourceUrls = Object.entries(observation.resource.urls)

  return (
    <section
      className="fixed right-2 top-14 z-10 max-h-[calc(100vh-4.5rem)] w-[min(30rem,calc(100vw-1rem))] overflow-y-auto border-2 border-[rgba(125,211,252,0.58)] bg-[rgba(5,17,28,0.98)] p-3 text-[#e0f2fe] shadow-[0_0_0_1px_rgba(186,230,253,0.16),0_14px_0_rgba(0,0,0,0.3)] sm:right-4 sm:top-16 sm:p-4"
      role="dialog"
      aria-modal="false"
      aria-label="第一关 renderer 原生观测"
      data-testid="first-dungeon-chunk-observability-panel"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(125,211,252,0.26)] pb-3">
        <div className="min-w-0">
          <p className="font-pixel text-[8px] text-[#7dd3fc]">仅本地开发 · renderer 原生只读观测</p>
          <h2 className="mt-1 font-pixel text-sm text-[#f0f9ff]">第一关地形观测</h2>
          <p className="mt-2 text-xs leading-5 text-[#bae6fd]">不会触碰模拟、战斗快照、Zustand、存档、localStorage 或项目配置。</p>
        </div>
        <button
          type="button"
          className="shrink-0 border border-[rgba(186,230,253,0.55)] bg-[#10324a] px-2 py-1 font-pixel text-[8px] text-[#e0f2fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bae6fd]"
          onClick={onClose}
          aria-label="关闭第一关地形观测"
        >
          关闭
        </button>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="border border-[#67e8f9] bg-[#164e63] px-3 py-2 font-pixel text-[8px] text-[#ecfeff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a5f3fc]"
          onClick={refreshObservation}
          data-testid="first-dungeon-chunk-observability-refresh"
          aria-label="刷新 renderer 观测"
        >
          刷新 renderer 观测
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#bae6fd]" role="status" aria-live="polite" data-testid="first-dungeon-chunk-observability-feedback">
        {feedback || '显示当前 renderer 已记录的原始观测；这些样本不等同于整体验收结论。'}
      </p>

      <div className="mt-4 space-y-3">
        <section className="border border-[rgba(125,211,252,0.25)] bg-[rgba(12,36,52,0.62)] p-3" data-testid="first-dungeon-renderer-observation-resource">
          <h3 className="font-pixel text-[9px] text-[#a5f3fc]">资源</h3>
          <p className="mt-2 text-xs leading-5">状态：{observation.resource.state} · 验证：{resourceValidationLabel(observation.resource.validation)}</p>
          {observation.resource.failureReason ? <p className="mt-1 break-words text-xs leading-5 text-[#fecaca]">失败原因：{observation.resource.failureReason}</p> : null}
          <ul className="mt-2 space-y-1 break-all text-xs leading-5">
            {resourceUrls.map(([name, url]) => <li key={name}>{name}：{url}</li>)}
          </ul>
        </section>

        <section className="border border-[rgba(125,211,252,0.25)] bg-[rgba(12,36,52,0.62)] p-3" data-testid="first-dungeon-renderer-observation-macro">
          <h3 className="font-pixel text-[9px] text-[#a5f3fc]">宏观覆盖</h3>
          <p className="mt-2 text-xs leading-5">已生成格：{observation.macroCoverage.generatedCellCount}</p>
          {observation.macroCoverage.samples.length === 0 ? <p className="mt-1 text-xs leading-5 text-[#bae6fd]">尚未观测。</p> : (
            <ul className="mt-2 space-y-2 text-xs leading-5">
              {observation.macroCoverage.samples.map((sample, index) => (
                <li key={`${sample.seed}:${sample.worldCellRange.startX}:${sample.worldCellRange.startY}:${index}`}>
                  seed {sample.seed} · world cells {formatRange(sample.worldCellRange)} · stoneCoverage {sample.stoneCoverage} · groups {sample.connectedStoneGroups} · small components {sample.smallStoneComponents} · moss {sample.mossComponents} / narrow moss {sample.narrowMossComponents} · isolated stone {sample.isolatedStoneCells} · isolated moss holes {sample.isolatedMossHoles} · checkerboard {sample.checkerboardWindows}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-[rgba(125,211,252,0.25)] bg-[rgba(12,36,52,0.62)] p-3" data-testid="first-dungeon-renderer-observation-mask-composition">
          <h3 className="font-pixel text-[9px] text-[#a5f3fc]">遮罩合成</h3>
          {observation.maskComposition.totalMaskCells === 0 ? <p className="mt-2 text-xs leading-5 text-[#bae6fd]">尚未观测。</p> : (
            <p className="mt-2 text-xs leading-5">总覆盖 {observation.maskComposition.totalMaskCells} · 完整内部石砖 mask=15：{observation.maskComposition.interiorStoneMaskCells} · 仅外轮廓边缘遮罩：{observation.maskComposition.edgeMaskCells}</p>
          )}
        </section>

        <section className="border border-[rgba(125,211,252,0.25)] bg-[rgba(12,36,52,0.62)] p-3" data-testid="first-dungeon-renderer-observation-ready-bitmaps">
          <h3 className="font-pixel text-[9px] text-[#a5f3fc]">就绪 512px 区块</h3>
          {observation.readyBitmaps.length === 0 ? <p className="mt-2 text-xs leading-5 text-[#bae6fd]">尚未观测。</p> : (
            <ul className="mt-2 space-y-2 break-all text-xs leading-5">
              {observation.readyBitmaps.map((bitmap) => <li key={bitmap.key}>key {bitmap.key} · seed {bitmap.seed} · chunk ({bitmap.chunkX}, {bitmap.chunkY}) · {bitmap.builtCells} 格 · 累计建块 {formatDuration(bitmap.buildDurationMs)}</li>)}
            </ul>
          )}
        </section>

        <section className="border border-[rgba(125,211,252,0.25)] bg-[rgba(12,36,52,0.62)] p-3" data-testid="first-dungeon-renderer-observation-reuse-draw">
          <h3 className="font-pixel text-[9px] text-[#a5f3fc]">复用与绘制</h3>
          <p className="mt-2 text-xs leading-5">复用次数：{observation.reuseAndDraw.reuseCount}</p>
          {observation.reuseAndDraw.draws.length === 0 ? <p className="mt-1 text-xs leading-5 text-[#bae6fd]">尚未观测。</p> : (
            <ul className="mt-2 space-y-2 break-all text-xs leading-5">
              {observation.reuseAndDraw.draws.map((draw, index) => <li key={`${draw.seed}:${draw.camera.x}:${draw.camera.y}:${index}`}>seed {draw.seed} · camera {formatCamera(draw.camera)} · visible {draw.visibleChunkKeys.join(', ') || '无'} · {formatDuration(draw.durationMs)} · visible-ready {String(draw.visibleReady)} · fallback {String(draw.fallback)}</li>)}
            </ul>
          )}
        </section>

        <section className="border border-[rgba(125,211,252,0.25)] bg-[rgba(12,36,52,0.62)] p-3" data-testid="first-dungeon-renderer-observation-fallback">
          <h3 className="font-pixel text-[9px] text-[#a5f3fc]">回退</h3>
          {observation.fallback.reasons.length === 0 ? <p className="mt-2 text-xs leading-5 text-[#bae6fd]">尚未观测到回退。</p> : <ul className="mt-2 space-y-1 break-words text-xs leading-5 text-[#fecaca]">{observation.fallback.reasons.map((reason, index) => <li key={`${reason}:${index}`}>{reason}</li>)}</ul>}
        </section>
      </div>
    </section>
  )
}
