import { ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE } from './archerSkills'

export const ARCHER_SKILL_ICON_BASE_PATH = 'assets/skills/archer/icons'

export const ARCHER_SKILL_ICON_NAME_BY_ID: Readonly<Record<string, string>> = Object.freeze({
  [ARCHER_FIXED_PASSIVE.id]: ARCHER_FIXED_PASSIVE.name,
  ...Object.fromEntries(ARCHER_ACTIVE_SKILLS.map((skill) => [skill.id, skill.name])),
})

export const getArcherSkillIconAssetPath = (skillId: string) => {
  const name = ARCHER_SKILL_ICON_NAME_BY_ID[skillId]
  return name ? `${ARCHER_SKILL_ICON_BASE_PATH}/${name}.png` : undefined
}

export const getArcherSkillIconAssetUrl = (skillId: string) => {
  const path = getArcherSkillIconAssetPath(skillId)
  if (!path) return undefined

  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return `${baseUrl}${encodedPath}`
}
