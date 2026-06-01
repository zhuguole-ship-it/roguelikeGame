import type { PropsWithChildren, ReactNode } from 'react'

type PixelPanelProps = PropsWithChildren<{
  title?: string
  icon?: ReactNode
  className?: string
}>

export function PixelPanel({ children, title, icon, className = '' }: PixelPanelProps) {
  return (
    <section className={`pixel-panel p-4 md:p-5 ${className}`.trim()}>
      {title ? (
        <div className="mb-4 flex items-center gap-3 text-[#f4f0d7]">
          <span className="text-amber-300">{icon}</span>
          <h2 className="font-pixel text-[10px] uppercase tracking-[0.22em] md:text-xs">{title}</h2>
        </div>
      ) : null}
      {children}
    </section>
  )
}
