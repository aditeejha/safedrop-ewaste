import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RequireAuth } from '../components/RequireAuth'
import { ErrorNote, Page, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { api, errorText } from '../lib/api'
import { formatDate } from '../lib/data'
import type { Collector } from '../lib/types'

function AdminView() {
  const client = useQueryClient()
  const collectors = useQuery({ queryKey: ['admin-collectors'], queryFn: () => api<Collector[]>('/admin/collectors') })
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => api(`/admin/collectors/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-collectors'] }),
  })
  return (
    <Page>
      <PageHeader
        eyebrow="Admin"
        title="Pickup partner applications"
        intro="Approve a kabadiwala only after a verification call. Approval publishes their name and pincodes to customers whose pickups they accept, which they consented to when applying."
      />
      {collectors.isLoading && <Spinner />}
      {collectors.isError && <ErrorNote>{errorText(collectors.error)}</ErrorNote>}
      {decide.isError && <ErrorNote>{errorText(decide.error)}</ErrorNote>}
      <div className="card divide-y divide-line">
        {(collectors.data ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-ink-3">
                {c.area || 'Area not given'} · pincodes {(c.status === 'approved' ? c.pincodes : c.requestedPincodes ?? []).join(', ')} · applied {formatDate(c.createdAt)}
                {c.consentAt ? ' · consent recorded' : ''}
              </p>
            </div>
            <StatusBadge status={c.status} />
            {c.status === 'pending' && (
              <div className="flex gap-2">
                <button type="button" className="btn-sky px-3 py-1.5" onClick={() => decide.mutate({ id: c.id, action: 'approve' })}>
                  Approve
                </button>
                <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => decide.mutate({ id: c.id, action: 'reject' })}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Page>
  )
}

export default function Admin() {
  return <RequireAuth>{() => <AdminView />}</RequireAuth>
}
