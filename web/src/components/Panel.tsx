import type { ReactNode } from 'react'

interface Props {
  title: string
  titleId?: string
  aside?: ReactNode
  className?: string
  children: ReactNode
}

export function Panel({ title, titleId, aside, className = '', children }: Props) {
  return (
    <section aria-labelledby={titleId} className={`panel p-5 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <h2 id={titleId} className="scroll-mt-24 font-display text-xl font-bold text-ink">
          {title}
        </h2>
        {aside}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  )
}
