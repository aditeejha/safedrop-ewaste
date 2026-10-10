import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSession, type Session } from '../lib/auth'
import { Page, Spinner } from './ui'

export function RequireAuth({ children, partner }: { children: (session: Session) => ReactNode; partner?: boolean }) {
  const session = useSession()
  const location = useLocation()
  if (session.isLoading) return <Page><Spinner /></Page>
  if (!session.data) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (partner && !session.data.groups.includes('partner')) {
    return (
      <Page narrow>
        <h1 className="text-2xl font-semibold">Partner portal</h1>
        <p className="mt-3 text-ink-2">This page is for staff at SafeDrop drop points. Sign in with a partner account to verify handovers.</p>
      </Page>
    )
  }
  return <>{children(session.data)}</>
}
