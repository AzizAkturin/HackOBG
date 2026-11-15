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
      <header className="flex items-center gap-3">
        <h2 id={titleId} className="label shrink-0 scroll-mt-24 text-ink">
          {title}
        </h2>
        <span className="h-0 flex-1 border-t-2 border-dashed border-line" aria-hidden />
        {aside}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  )
}
