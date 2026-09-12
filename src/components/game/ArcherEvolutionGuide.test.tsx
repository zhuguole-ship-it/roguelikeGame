import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ARCHER_SKILL_EVOLUTION_MAP } from '../../game/archerSkillEvolution'
import { ArcherEvolutionGuide, createArcherEvolutionGuideCatalog, type ArcherEvolutionGuideCatalog } from './ArcherEvolutionGuide'

const catalog: ArcherEvolutionGuideCatalog = {
  discoveredEvolutionIds: ['test-evolution-discovered', 'test-evolution-with-art'],
  families: [
    {
      familyId: 'test-family',
      name: '测试核心技能',
      buildTag: 'pierce',
      evolutions: [
        {
          evolutionId: 'test-evolution-discovered',
          name: '文字占位进化',
          level4Description: '获得清晰的主表现。',
          level5Description: '强化命中反馈。',
          tags: ['穿透', '风刃'],
          visualPreview: '青绿风刃与切割残影',
        },
        {
          evolutionId: 'test-evolution-undiscovered',
          name: '灰色已知名称',
          level4Description: '此说明不应提前展示。',
          level5Description: '此说明不应提前展示。',
          tags: ['隐藏'],
        },
        {
          evolutionId: 'test-evolution-with-art',
          name: '已有图标进化',
          iconResource: {
            key: 'skill-icon.test-evolution-with-art',
            version: 'test-v1',
            domain: 'skill-icons',
            kind: 'image',
            url: '/assets/test-evolution.png',
          },
          level4Description: '使用正式图标。',
          level5Description: '继续强化。',
          tags: ['命中'],
        },
      ],
    },
  ],
}

describe('ArcherEvolutionGuide', () => {
  it('renders discovered evolutions with a readable name placeholder and the complete tooltip fields', () => {
    render(<ArcherEvolutionGuide catalog={catalog} />)

    expect(screen.getByTestId('archer-evolution-guide-build-pierce').textContent).toContain('穿透直线')
    const family = screen.getByTestId('archer-evolution-guide-family-test-family')
    expect(family.textContent).toContain('测试核心技能')
    const discovered = screen.getByTestId('archer-evolution-guide-discovered-test-evolution-discovered')
    expect(discovered.getAttribute('aria-describedby')).toBe('archer-evolution-guide-tooltip-test-evolution-discovered')
    expect(screen.getByTestId('evolution-name-placeholder-文字占位进化').textContent).toBe('文字占位进化')
    expect(screen.getByTestId('archer-evolution-guide-image-test-evolution-with-art').getAttribute('data-scene-asset-logical-url')).toBe('/assets/test-evolution.png')
    expect(screen.getByTestId('archer-evolution-guide-image-test-evolution-with-art').getAttribute('src')).toBeNull()

    fireEvent.mouseEnter(discovered)
    const tooltip = screen.getByTestId('archer-evolution-guide-tooltip-test-evolution-discovered')
    expect(tooltip.parentElement).toBe(document.body)
    expect(tooltip.textContent).toContain('所属核心技能：测试核心技能')
    expect(tooltip.textContent).toContain('Lv.4：获得清晰的主表现。')
    expect(tooltip.textContent).toContain('Lv.5：强化命中反馈。')
    expect(tooltip.textContent).toContain('流派：穿透直线')
    expect(tooltip.textContent).toContain('标签：穿透 / 风刃')
    expect(tooltip.textContent).toContain('特效预览：青绿风刃与切割残影')
    fireEvent.mouseLeave(discovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-test-evolution-discovered')).toBeNull()

    fireEvent.focus(discovered)
    expect(screen.getByTestId('archer-evolution-guide-tooltip-test-evolution-discovered')).toBeTruthy()
    fireEvent.blur(discovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-test-evolution-discovered')).toBeNull()
  })

  it('keeps undiscovered entries gray while exposing their name without any interactive tooltip', () => {
    render(<ArcherEvolutionGuide catalog={catalog} />)

    const undiscovered = screen.getByTestId('archer-evolution-guide-undiscovered-test-evolution-undiscovered')
    expect(undiscovered.tagName).toBe('DIV')
    expect(undiscovered.textContent).toContain('灰色已知名称')
    expect(undiscovered.className).toContain('grayscale')
    expect(within(undiscovered).queryByRole('button')).toBeNull()
    fireEvent.mouseEnter(undiscovered)
    fireEvent.click(undiscovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-test-evolution-undiscovered')).toBeNull()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('toggles a discovered tooltip from click without creating a tooltip for an undiscovered sibling', () => {
    render(<ArcherEvolutionGuide catalog={catalog} />)

    const discovered = screen.getByTestId('archer-evolution-guide-discovered-test-evolution-with-art')
    fireEvent.click(discovered)
    expect(screen.getByTestId('archer-evolution-guide-tooltip-test-evolution-with-art')).toBeTruthy()
    fireEvent.click(discovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-test-evolution-with-art')).toBeNull()
  })

  it('adapts the single A1 21-core/42-evolution source without restoring retired migration IDs', () => {
    const liveCatalog = createArcherEvolutionGuideCatalog(['wind-cut', 'cross-cut', 'blood-scent'])

    expect(liveCatalog.families).toHaveLength(21)
    expect(liveCatalog.families.every((family) => family.evolutions.length === 2)).toBe(true)
    expect(liveCatalog.families.filter((family) => family.buildTag === 'pierce')).toHaveLength(5)
    expect(liveCatalog.families.filter((family) => family.buildTag === 'spread')).toHaveLength(5)
    expect(liveCatalog.families.filter((family) => family.buildTag === 'control')).toHaveLength(5)
    expect(liveCatalog.families.filter((family) => family.buildTag === 'beast')).toHaveLength(6)
    expect(liveCatalog.discoveredEvolutionIds).toEqual(['wind-cut', 'cross-cut', 'blood-scent'])
    const windCut = liveCatalog.families.flatMap((family) => family.evolutions).find((entry) => entry.evolutionId === 'wind-cut')
    expect(windCut).toMatchObject({ name: ARCHER_SKILL_EVOLUTION_MAP['wind-cut'].name })
    expect(windCut?.iconResource?.url).toContain('/assets/skills/archer/icons/')
    const beastEvolution = liveCatalog.families.flatMap((family) => family.evolutions).find((entry) => entry.evolutionId === 'frost-wolf-king')
    expect(beastEvolution?.iconResource).toBeUndefined()
    expect(liveCatalog.families.map((family) => family.familyId)).not.toEqual(expect.arrayContaining(['heavy-snipe', 'dawn-bolt', 'weakness-trace']))
    const spiralBreak = liveCatalog.families.find((family) => family.familyId === 'spiral-break')
    expect(spiralBreak).toMatchObject({ buildTag: 'pierce' })
    expect(spiralBreak?.evolutions.map((evolution) => evolution.evolutionId)).toEqual(['cross-cut', 'blood-scent'])
    expect(spiralBreak?.evolutions.every((evolution) => evolution.tags.includes('螺旋'))).toBe(true)
  })

  it('keeps E11 concentrated-fan and double-crescent copy in the read-only guide presentation', () => {
    const liveCatalog = createArcherEvolutionGuideCatalog(['gale-barrage', 'final-hunt', 'double-crescent'])
    const quickTriple = liveCatalog.families.find((family) => family.familyId === 'quick-triple')
    const galeBarrage = quickTriple?.evolutions.find((entry) => entry.evolutionId === 'gale-barrage')
    const finalHunt = quickTriple?.evolutions.find((entry) => entry.evolutionId === 'final-hunt')
    const doubleCrescent = liveCatalog.families
      .flatMap((family) => family.evolutions)
      .find((entry) => entry.evolutionId === 'double-crescent')

    expect(quickTriple?.trajectoryPreview).toContain('45° 集中扇形')
    expect(quickTriple?.trajectoryPreview).toContain('血羽·血雨时为 60°')
    expect(galeBarrage?.visualPreview).toContain('追加箭不会扩大扇角')
    expect(finalHunt?.visualPreview).toContain('45° 集中扇形')
    expect(doubleCrescent?.visualPreview).toContain('45% 节点')
    expect(doubleCrescent?.visualPreview).toContain('48 世界单位')

    render(<ArcherEvolutionGuide catalog={liveCatalog} />)
    expect(screen.getByTestId('archer-evolution-guide-family-quick-triple').textContent).toContain('真总角 45° 集中扇形')
    fireEvent.focus(screen.getByTestId('archer-evolution-guide-discovered-double-crescent'))
    expect(screen.getByTestId('archer-evolution-guide-tooltip-double-crescent').textContent).toContain('固定 60° 双月内收')
  })

  it('uses the spiral-break flight presentation copy without static orbit or execute-threshold claims', () => {
    const liveCatalog = createArcherEvolutionGuideCatalog(['cross-cut', 'blood-scent'])
    const spiralBreak = liveCatalog.families.find((family) => family.familyId === 'spiral-break')
    const crossCut = spiralBreak?.evolutions.find((entry) => entry.evolutionId === 'cross-cut')
    const bloodScent = spiralBreak?.evolutions.find((entry) => entry.evolutionId === 'blood-scent')

    expect(spiralBreak?.trajectoryPreview).toContain('持续至时间或命中预算耗尽后开始CD')
    expect(crossCut?.visualPreview).toContain('交叉切击 2x')
    expect(crossCut?.visualPreview).toContain('持续至时间或命中预算耗尽后开始CD')
    expect(crossCut?.level4Description).toContain('交叉切击 2x')
    expect(crossCut?.level5Description).toContain('交叉切击 2x')
    expect(bloodScent?.visualPreview).toContain('真实伤害斩杀优先、无斩杀立即正常追击')
    expect(bloodScent?.level4Description).toContain('真实伤害斩杀优先、无斩杀立即正常追击')
    expect(bloodScent?.level5Description).toContain('真实伤害判定斩杀优先')
    expect(bloodScent?.visualPreview).not.toContain('30%')
    expect(bloodScent?.visualPreview).not.toContain('低血必斩')

    render(<ArcherEvolutionGuide catalog={liveCatalog} />)
    expect(screen.getByTestId('archer-evolution-guide-family-spiral-break').textContent).toContain('持续至时间或命中预算耗尽后开始CD')
    fireEvent.focus(screen.getByTestId('archer-evolution-guide-discovered-cross-cut'))
    expect(screen.getByTestId('archer-evolution-guide-tooltip-cross-cut').textContent).toContain('交叉切击 2x')
    fireEvent.blur(screen.getByTestId('archer-evolution-guide-discovered-cross-cut'))
    fireEvent.focus(screen.getByTestId('archer-evolution-guide-discovered-blood-scent'))
    expect(screen.getByTestId('archer-evolution-guide-tooltip-blood-scent').textContent).toContain('真实伤害斩杀优先、无斩杀立即正常追击')
  })

  it('keeps legacy arrow-screen and independent arrow-turret branches isolated on the shared codex contract', () => {
    const liveCatalog = createArcherEvolutionGuideCatalog([
      'moonshard-volley',
      'sunflare-sweep',
      'feather-resonance',
      'bait-bastion',
    ])
    const screenFamily = liveCatalog.families.find((family) => family.familyId === 'arrow-screen')
    const turretFamily = liveCatalog.families.find((family) => family.familyId === 'arrow-turret')
    const moonshard = screenFamily?.evolutions.find((entry) => entry.evolutionId === 'moonshard-volley')
    const sunflare = screenFamily?.evolutions.find((entry) => entry.evolutionId === 'sunflare-sweep')
    const resonance = turretFamily?.evolutions.find((entry) => entry.evolutionId === 'feather-resonance')
    const taunt = turretFamily?.evolutions.find((entry) => entry.evolutionId === 'bait-bastion')

    expect(screenFamily).toMatchObject({ name: '箭幕推进', buildTag: 'spread' })
    expect(moonshard).toMatchObject({ name: '月碎连矢', level5Description: '列数和减速提高' })
    expect(sunflare).toMatchObject({ name: '炽阳扫射', level5Description: '更多灼热箭与延长灼烧' })
    expect(turretFamily).toMatchObject({ name: '箭幕哨塔', buildTag: 'spread' })
    expect(resonance).toMatchObject({
      name: '百羽共鸣',
      level4Description: '每组哨塔继承一种其他散射核心箭效。',
      level5Description: '共鸣效果提高 25%',
    })
    expect(taunt).toMatchObject({
      name: '诱敌战垒',
      level4Description: '双塔嘲讽普通怪并可进入狂暴。',
      level5Description: '生命、范围与狂暴窗口强化',
    })

    render(<ArcherEvolutionGuide catalog={liveCatalog} />)
    fireEvent.focus(screen.getByTestId('archer-evolution-guide-discovered-moonshard-volley'))
    expect(screen.getByTestId('archer-evolution-guide-tooltip-moonshard-volley').textContent).toContain('Lv.5：列数和减速提高')
    fireEvent.blur(screen.getByTestId('archer-evolution-guide-discovered-moonshard-volley'))
    fireEvent.focus(screen.getByTestId('archer-evolution-guide-discovered-feather-resonance'))
    expect(screen.getByTestId('archer-evolution-guide-tooltip-feather-resonance').textContent).toContain('Lv.5：共鸣效果提高 25%')
  })
})
