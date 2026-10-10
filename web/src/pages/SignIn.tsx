import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ErrorNote, Notice, Page } from '../components/ui'
import { errorText } from '../lib/api'
import { useAuthActions } from '../lib/auth'

export default function SignIn() {
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/drawer'
  const navigate = useNavigate()
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await signIn(email, password)
      if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        navigate(`/signup?confirm=${encodeURIComponent(email)}`)
        return
      }
      navigate(next.startsWith('/') ? next : '/drawer', { replace: true })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page narrow>
      <div className="mx-auto max-w-md">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to SafeDrop</h1>
        <p className="mt-2 text-sm text-ink-2">Your drawer, bookings and certificates in one place.</p>
        <div className="mt-6">
          <Notice tone="gold">
            <span className="font-medium">Judging?</span> Use the demo account <span className="font-mono">demo@example.com</span> /{' '}
            <span className="font-mono">SafeDrop@2026</span>. It is both a user and a drop-point partner.
          </Notice>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Sign in
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setEmail('demo@example.com')
              setPassword('SafeDrop@2026')
            }}
          >
            Fill in the demo account
          </button>
        </form>
        <p className="mt-6 text-sm text-ink-2">
          New here?{' '}
          <Link to={`/signup?next=${encodeURIComponent(next)}`} className="link">
            Create a free account
          </Link>
        </p>
      </div>
    </Page>
  )
}
