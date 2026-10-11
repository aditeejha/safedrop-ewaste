import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Factory, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { RequireAuth } from '../components/RequireAuth'
import { ErrorNote, Page, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { api, errorText } from '../lib/api'
import { formatDate, kindLabels } from '../lib/data'
import type { Dispatch, Facility } from '../lib/types'

function ConfirmForm({ dispatch }: { dispatch: Dispatch }) {
  const client = useQueryClient()
  const [evidence, setEvidence] = useState('')
  const confirm = useMutation({
    mutationFn: () => api(`/processor/dispatches/${dispatch.id}/confirm`, { method: 'POST', json: { evidence }, idempotencyKey: `${dispatch.id}-confirm` }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['processor-dispatches'] }),
  })
  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        confirm.mutate()
      }}
    >
      <input className="field min-w-0 flex-1" placeholder="Your receipt or processing reference" value={evidence} onChange={(e) => setEvidence(e.target.value)} minLength={4} required />
      <button type="submit" className="btn-primary" disabled={evidence.trim().length < 4 || confirm.isPending}>
        {confirm.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Confirm received for processing
      </button>
      {confirm.isError && <div className="w-full"><ErrorNote>{errorText(confirm.error)}</ErrorNote></div>}
    </form>
  )
}

function ProcessorView() {
  const facility = useQuery({ queryKey: ['processor-facility'], queryFn: () => api<Facility>('/processor/facility') })
  const dispatches = useQuery({ queryKey: ['processor-dispatches'], queryFn: () => api<Dispatch[]>('/processor/dispatches') })
  return (
    <Page>
      <PageHeader
        eyebrow="Recycling facility"
        title={facility.data?.name ?? 'Your facility'}
        intro="Batches sent to you by SafeDrop drop points. Confirm each batch only when it has physically arrived, with your own receipt or processing reference as evidence."
      >
        {facility.data?.demo && <span className="chip border-ember-400 text-ember-700">Demo facility</span>}
      </PageHeader>
      {facility.isError && <ErrorNote>{errorText(facility.error)}</ErrorNote>}
      {dispatches.isLoading && <Spinner />}
      <div className="space-y-4">
        {(dispatches.data ?? []).length === 0 && !dispatches.isLoading && <p className="card p-5 text-sm text-ink-3">No batches have been sent to this facility yet.</p>}
        {(dispatches.data ?? []).map((d) => (
          <div key={d.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold">
                <Factory className="size-4 text-sky-600" aria-hidden="true" /> From {d.pointName}
              </p>
              <StatusBadge status={d.status} />
            </div>
            <p className="mt-1 text-sm text-ink-3">
              Manifest {d.reference} · sent {formatDate(d.createdAt)} · {d.totalKg} kg
              {d.evidence ? ` · confirmed with ${d.evidence} on ${formatDate(d.processedAt!)}` : ''}
            </p>
            <ul className="mt-3 divide-y divide-line border border-line text-sm">
              {d.items.map((i) => (
                <li key={i.deviceId} className="flex justify-between gap-3 px-3 py-2">
                  <span>
                    {i.label} <span className="text-xs text-ink-3">{kindLabels[i.kind]}</span>
                  </span>
                  <span className="tabular-nums">{i.kg} kg</span>
                </li>
              ))}
            </ul>
            {d.status === 'dispatched' && <ConfirmForm dispatch={d} />}
          </div>
        ))}
      </div>
    </Page>
  )
}

export default function Processor() {
  return <RequireAuth>{() => <ProcessorView />}</RequireAuth>
}
