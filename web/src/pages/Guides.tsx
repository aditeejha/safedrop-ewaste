import { ArrowRight, Clock, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import { guideProgress } from '../components/Checklist'
import { Page, PageHeader, Picture, Spinner } from '../components/ui'
import { useGuides } from '../lib/data'
import { readLocalProgress } from './GuidePage'

const accent: Record<string, string> = {
  android: 'bg-sky-500',
  samsung: 'bg-sky-500',
  iphone: 'bg-ink',
  windows: 'bg-sky-400',
  mac: 'bg-ink-2',
  chromebook: 'bg-gold-400',
  'feature-phone': 'bg-gold-400',
  storage: 'bg-ember-500',
  'india-phone-extras': 'bg-gold-500',
  'tv-router-printer': 'bg-ember-400',
}

export default function Guides() {
  const guides = useGuides()
  return (
    <Page>
      <PageHeader
        eyebrow="Wipe guides"
        title="Wipe it properly, the first time"
        intro="Ten checklists written from each maker’s own help pages. No account needed: progress stays on this device, and once opened the guides keep working without internet. For a wipe record on your receipt, add the device to your drawer."
      />
      <div className="mb-10 grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Picture name="step-wipe" alt="An old phone being reset, with its SIM tray and memory card removed" className="aspect-[3/2] w-full border border-line" />
        <div className="card flex flex-col justify-center gap-3 p-6">
          <p className="eyebrow">Why it matters</p>
          <p className="text-[15px] leading-relaxed text-ink-2">
            A factory reset alone isn’t always enough. If your Google or Apple account is still signed in, the next person can’t use the phone, and
            recyclers may set it aside. Steps marked{' '}
            <span className="inline-flex items-center gap-1 border border-ember-400/50 bg-ember-50 px-1.5 font-mono text-[10px] uppercase text-ember-700">
              <ShieldAlert className="size-3" /> Critical
            </span>{' '}
            are the ones that protect your data or stop a device lock.
          </p>
        </div>
      </div>
      {guides.isLoading && <Spinner />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.data?.guides.map((guide) => {
          const progress = guideProgress(guide, readLocalProgress(guide.id))
          return (
            <Link key={guide.id} to={`/wipe/${guide.id}`} className="card group flex flex-col p-5 transition-colors hover:border-ink">
              <span className={`h-1 w-10 ${accent[guide.id] ?? 'bg-sky-500'}`} />
              <h2 className="mt-4 text-lg font-semibold leading-snug">{guide.title}</h2>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> ~{guide.minutes} min
                </span>
                <span>{progress.total} steps</span>
                <span className="text-ember-700">{progress.critical} critical</span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-5 text-sm">
                <span className="text-ink-3">{progress.answered ? `${progress.answered}/${progress.total} answered` : `Reviewed ${guide.reviewedAt}`}</span>
                <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
              </div>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
