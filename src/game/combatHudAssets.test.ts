/// <reference types="node" />

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  COMBAT_HUD_V2_RUNTIME_ASSETS,
  COMBAT_HUD_V2_SOURCE_ASSETS,
  getCombatHudV2AssetUrl,
} from './combatHudAssets'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const readPng = (relativePath: string) => {
  const bytes = readFileSync(path.resolve(process.cwd(), 'public/assets/ui/combat-hud-v2', relativePath))
  return {
    bytes,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  }
}

describe('combat HUD v2 assets', () => {
  it('keeps the four approved source copies byte-identical in the controlled project directory', () => {
    for (const metadata of Object.values(COMBAT_HUD_V2_SOURCE_ASSETS)) {
      const { bytes, width, height } = readPng(`source/${metadata.fileName}`)
      expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(metadata.sha256)
      expect(width).toBe(metadata.width)
      expect(height).toBe(metadata.height)
    }
  })

  it('uses transparent project-local runtime crops with no absolute runtime paths', () => {
    for (const [asset, metadata] of Object.entries(COMBAT_HUD_V2_RUNTIME_ASSETS)) {
      const { bytes, width, height, colorType } = readPng(metadata.fileName)
      const url = getCombatHudV2AssetUrl(asset as keyof typeof COMBAT_HUD_V2_RUNTIME_ASSETS)

      expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(metadata.sha256)
      expect(width).toBe(metadata.width)
      expect(height).toBe(metadata.height)
      expect(colorType).toBe(6)
      expect(url).toContain(`/assets/ui/combat-hud-v2/${metadata.fileName}`)
      expect(url).not.toContain('/Users/')
      expect(metadata.source).toBeTruthy()
    }
  })
})
