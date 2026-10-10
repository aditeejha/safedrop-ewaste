import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router'
import { Page } from './ui'

const reloadKey = 'safedrop.reloaded-at'

// After a redeploy, an open tab can ask for code files that no longer exist; one reload fixes it.
export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(reloadKey) ?? 0)
    if (Date.now() - last < 15_000) return false
    sessionStorage.setItem(reloadKey, String(Date.now()))
  } catch {}
  window.location.reload()
  return true
}

function isStaleBuild(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)
}

export function RouteError() {
  const error = useRouteError()
  const stale = isStaleBuild(error)
  useEffect(() => {
    if (stale) reloadOnce()
  }, [stale])
  return (
    <Page narrow>
      <p className="eyebrow">{stale ? 'New version available' : 'Something went wrong'}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{stale ? 'Loading the latest SafeDrop…' : 'This page hit an error'}</h1>
      <p className="mt-3 text-ink-2">{stale ? 'The site was just updated. If nothing happens, reload the page.' : 'Please reload the page. If it keeps happening, go back home.'}</p>
      <div className="mt-6 flex gap-3">
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
        <Link to="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </Page>
  )
}
