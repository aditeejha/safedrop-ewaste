import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ErrorNote, Notice, Page } from '../components/ui'
import { errorText } from '../lib/api'
import { useAuthActions } from '../lib/auth'

export default function SignUp() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const auth = useAuthActions()
  const next = params.get('next') ?? '/drawer'
  const [stage, setStage] = useState<'form' | 'confirm'>(params.get('confirm') ? 'confirm' : 'form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(params.get('confirm') ?? '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page narrow>
      <div className="mx-auto max-w-md">
        <p className="eyebrow">Free account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{stage === 'form' ? 'Create your SafeDrop account' : 'Check your email'}</h1>
        {stage === 'form' ? (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              run(async () => {
                const result = await auth.signUp(name, email, password)
                if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') setStage('confirm')
                else {
                  await auth.signIn(email, password)
                  navigate(next, { replace: true })
                }
              })
            }}
          >
            <div>
              <label className="label" htmlFor="name">Your name</label>
              <input id="name" required maxLength={60} className="field" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-ink-3">At least 8 characters, with a number and a lowercase letter.</p>
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Create account
            </button>
          </form>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              run(async () => {
                await auth.confirm(email, code)
                if (password) {
                  await auth.signIn(email, password)
                  navigate(next, { replace: true })
                } else navigate(`/signin?next=${encodeURIComponent(next)}`, { replace: true })
              })
            }}
          >
            <p className="text-sm text-ink-2">
              We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>. It can take a minute to arrive.
            </p>
            <div>
              <label className="label" htmlFor="code">Verification code</label>
              <input id="code" inputMode="numeric" required className="field font-mono tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            {info && <Notice>{info}</Notice>}
            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Verify and continue
            </button>
            <button
              type="button"
              className="btn-ghost w-full"
              disabled={busy}
              onClick={() => run(async () => {
                await auth.resend(email)
                setInfo('A new code is on its way.')
              })}
            >
              Send a new code
            </button>
          </form>
        )}
        <p className="mt-6 text-sm text-ink-2">
          Already have an account? <Link to="/signin" className="link">Sign in</Link>
        </p>
      </div>
    </Page>
  )
}
