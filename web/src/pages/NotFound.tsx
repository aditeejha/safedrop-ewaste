import { Link } from 'react-router'
import { Page, Picture } from '../components/ui'

export default function NotFound() {
  return (
    <Page narrow>
      <Picture name="drawer-full" alt="A drawer full of old electronics" className="aspect-[3/2] w-full border border-line" />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">This page got lost in a drawer</h1>
      <p className="mt-3 text-ink-2">The link may be old or mistyped.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">Go home</Link>
        <Link to="/wipe" className="btn-ghost">Wipe guides</Link>
      </div>
    </Page>
  )
}
