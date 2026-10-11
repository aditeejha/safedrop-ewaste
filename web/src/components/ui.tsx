import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { bookingLabels, stageLabels } from '../lib/status'

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{intro}</p>}
      </div>
      {children}
    </div>
  )
}

export function Page({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto px-4 py-10 sm:px-6 sm:py-14 ${narrow ? 'max-w-3xl' : 'max-w-6xl'}`}>{children}</div>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-ink-3">
      <Loader2 className="size-4 animate-spin" /> {label}…
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 border border-ember-400/40 bg-ember-50 px-3 py-2.5 text-sm text-ember-700">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function Notice({ tone = 'sky', children }: { tone?: 'sky' | 'gold'; children: ReactNode }) {
  const tones = { sky: 'border-sky-200 bg-sky-50 text-sky-700', gold: 'border-gold-200 bg-gold-50 text-gold-700' }
  return <div className={`border px-3 py-2.5 text-sm ${tones[tone]}`}>{children}</div>
}

const statusStyles: Record<string, string> = {
  added: 'border-gold-300 bg-gold-50 text-gold-700',
  wiping: 'border-gold-400 bg-gold-100 text-gold-700',
  ready: 'border-sky-300 bg-sky-50 text-sky-700',
  booked: 'border-sky-500 bg-sky-500 text-white',
  accepted: 'border-gold-400 bg-gold-100 text-gold-700',
  collected: 'border-gold-500 bg-gold-400 text-ink',
  received: 'border-emerald-600 bg-emerald-50 text-emerald-700',
  dispatched: 'border-emerald-600 bg-emerald-100 text-emerald-800',
  processed: 'border-emerald-700 bg-emerald-700 text-white',
  pending: 'border-gold-300 bg-gold-50 text-gold-700',
  approved: 'border-emerald-600 bg-emerald-50 text-emerald-700',
  rejected: 'border-line-2 bg-paper text-ink-3',
  cancelled: 'border-line-2 bg-paper text-ink-3',
}
const statusText: Record<string, string> = {
  ...stageLabels,
  ...bookingLabels,
  booked: 'Handover booked',
  pending: 'Under review',
  approved: 'Approved',
  rejected: 'Not approved',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider ${statusStyles[status] ?? ''}`}>
      {statusText[status] ?? status}
    </span>
  )
}

export function Picture({ name, alt, className = '', fallback }: { name: string; alt: string; className?: string; fallback?: ReactNode }) {
  const exts = ['webp', 'png', 'jpg']
  const [index, setIndex] = useState(0)
  if (index >= exts.length) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-gold-50 ${className}`} aria-label={alt}>
        {fallback}
      </div>
    )
  }
  return <img src={`/images/${name}.${exts[index]}`} alt={alt} className={`object-cover ${className}`} onError={() => setIndex((i) => i + 1)} loading="lazy" />
}

export function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="border-l-2 border-gold-400 pl-4">
      <div className="text-2xl font-semibold tracking-tight text-ink tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1 text-sm text-ink-2">{label}</div>
      {hint && <div className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">{hint}</div>}
    </div>
  )
}

export function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-sky-700 underline decoration-sky-200 underline-offset-2 hover:decoration-sky-700">
      {children}
    </a>
  )
}
