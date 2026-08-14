/// <reference types="node" />

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { RUN_SETTLEMENT_BLACK_GOLD_ASSETS, getRunSettlementBlackGoldAssetUrl } from './runSettlementAssets'

describe('run settlement black-gold assets', () => {
  it('keeps the four approved project-local source files byte-identical and runtime-relative', () => {
    for (const [asset, metadata] of Object.entries(RUN_SETTLEMENT_BLACK_GOLD_ASSETS)) {
      const bytes = readFileSync(path.resolve(process.cwd(), 'public/assets/ui/run-settlement-black-gold', metadata.fileName))
      expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(metadata.sha256)
      expect(bytes.readUInt32BE(16)).toBe(metadata.width)
      expect(bytes.readUInt32BE(20)).toBe(metadata.height)
      expect(getRunSettlementBlackGoldAssetUrl(asset as keyof typeof RUN_SETTLEMENT_BLACK_GOLD_ASSETS)).toContain(`/assets/ui/run-settlement-black-gold/${metadata.fileName}`)
      expect(getRunSettlementBlackGoldAssetUrl(asset as keyof typeof RUN_SETTLEMENT_BLACK_GOLD_ASSETS)).not.toContain('/Users/')
      expect(metadata.sourceFile).toMatch(/^黑色背景切图\/[3467]@3x\.png$/)
    }
  })
})
