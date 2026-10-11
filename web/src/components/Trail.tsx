import { useQuery } from '@tanstack/react-query'
import { Link2, ShieldCheck, ShieldX } from 'lucide-react'
import { formatDate } from '../lib/data'
import { eventLabels, roleLabels } from '../lib/status'
import { verifyInBrowser } from '../lib/trail'
import type { TrailEvent } from '../lib/types'

export function TrailTimeline({ deviceId, events, serverIntact }: { deviceId: string; events: TrailEvent[]; serverIntact?: boolean }) {
  const check = useQuery({ queryKey: ['verify', deviceId, events.length, events.at(-1)?.hash], queryFn: () => verifyInBrowser(deviceId, events) })
  const sorted = [...events].sort((a, b) => a.seq - b.seq)
  const intact = check.data?.intact
  return (
    <div>
      <div
        className={`mb-3 flex items-start gap-2 border px-3 py-2 text-xs ${intact === false ? 'border-ember-400 bg-ember-50 text-ember-700' : 'border-emerald-600/40 bg-emerald-50 text-emerald-800'}`}
      >
        {intact === false ? <ShieldX className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
        <span>
          {check.isLoading
            ? 'Checking the hash chain in your browser…'
            : intact
              ? `Chain intact: your browser recomputed all ${sorted.length} event hashes${serverIntact ? ', and the server agrees' : ''}.`
              : `Chain broken at event ${check.data?.brokenAt}. These records may have been altered.`}{' '}
          Tamper-evident logging shows the record wasn’t edited; it isn’t proof of what physically happened.
        </span>
      </div>
      <ol className="relative space-y-3 border-l border-line pl-5">
        {sorted.map((e) => (
          <li key={e.seq} className="relative">
            <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-white bg-sky-500" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">{eventLabels[e.type] ?? e.type}</p>
            <p className="text-xs text-ink-3">
              {formatDate(e.at)} {new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {roleLabels[e.actorRole] ?? e.actorRole}
              {e.weightKg !== undefined ? ` · ${e.weightKg} ${e.unit ?? 'kg'}` : ''}
              {e.evidence ? ` · ref ${e.evidence}` : ''}
              {e.details?.reason ? ` · “${e.details.reason}”` : ''}
              {e.details?.guideVersion ? ` · guide v${e.details.guideVersion}` : ''}
            </p>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-ink-3" title={e.hash}>
              <Link2 className="size-3" aria-hidden="true" /> #{e.seq} · {e.hash.slice(0, 12)}… ← {e.prevHash.slice(0, 8)}…
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
