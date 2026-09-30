import type { ImgHTMLAttributes } from 'react'

/** Established static skill icons only; directional tower bodies stay combat-only. */
export function ArcherSkillIconImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} src={src} />
}
