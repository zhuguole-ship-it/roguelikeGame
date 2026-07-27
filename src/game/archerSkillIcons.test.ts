/// <reference types="node" />

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE } from './archerSkills'
import {
  ARCHER_SKILL_ICON_BASE_PATH,
  ARCHER_SKILL_ICON_NAME_BY_ID,
  getArcherSkillIconAssetPath,
  getArcherSkillIconAssetUrl,
} from './archerSkillIcons'

const targetIconModules = import.meta.glob('/public/assets/skills/archer/icons/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

const skillDefinitions = [ARCHER_FIXED_PASSIVE, ...ARCHER_ACTIVE_SKILLS]

const publicAssetPath = (assetPath: string) => path.resolve(process.cwd(), 'public', assetPath)

const readPngHeader = (assetPath: string) => {
  const bytes = readFileSync(publicAssetPath(assetPath))
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  expect(bytes.subarray(0, signature.length)).toEqual(signature)
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR')

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  }
}

describe('archer skill icon assets', () => {
  it('maps the fixed passive and every active skill to one project-local 64px RGB icon path', () => {
    expect(skillDefinitions).toHaveLength(56)
    expect(Object.keys(ARCHER_SKILL_ICON_NAME_BY_ID)).toHaveLength(56)
    expect(Object.keys(targetIconModules)).toHaveLength(56)

    for (const skill of skillDefinitions) {
      const assetPath = `${ARCHER_SKILL_ICON_BASE_PATH}/${skill.name}.png`
      const assetUrl = getArcherSkillIconAssetUrl(skill.id)

      expect(getArcherSkillIconAssetPath(skill.id)).toBe(assetPath)
      expect(targetIconModules).toHaveProperty(`/public/${assetPath}`)
      expect(assetUrl).toContain('/assets/skills/archer/icons/')
      expect(assetUrl).toContain(encodeURIComponent(`${skill.name}.png`))
      expect(assetUrl).not.toContain('/Users/')
      expect(assetUrl).not.toContain('Desktop')
      expect(assetUrl).not.toContain('roguelikeGameUI')

      expect(readPngHeader(assetPath), `${skill.id} PNG header`).toEqual({
        width: 64,
        height: 64,
        bitDepth: 8,
        colorType: 2,
      })
    }
  })

  it('uses only the normalized project filenames for the three confirmed source corrections', () => {
    expect(ARCHER_SKILL_ICON_NAME_BY_ID['eagle-eye-focus']).toBe('鹰眼专注')
    expect(ARCHER_SKILL_ICON_NAME_BY_ID['pierce-arrow']).toBe('穿刺箭')
    expect(ARCHER_SKILL_ICON_NAME_BY_ID['meteor-cluster']).toBe('流星箭簇')
    expect(targetIconModules).toHaveProperty('/public/assets/skills/archer/icons/鹰眼专注.png')
    expect(targetIconModules).toHaveProperty('/public/assets/skills/archer/icons/穿刺箭.png')
    expect(targetIconModules).toHaveProperty('/public/assets/skills/archer/icons/流星箭簇.png')
    expect(targetIconModules).not.toHaveProperty('/public/assets/skills/archer/icons/1鹰眼专注.png')
    expect(targetIconModules).not.toHaveProperty('/public/assets/skills/archer/icons/2穿刺箭.png')
    expect(targetIconModules).not.toHaveProperty('/public/assets/skills/archer/icons/流星箭筬.png')
  })

  it('does not substitute another icon when a stable skill id is unknown', () => {
    expect(getArcherSkillIconAssetPath('unknown-skill')).toBeUndefined()
    expect(getArcherSkillIconAssetUrl('unknown-skill')).toBeUndefined()
  })
})
