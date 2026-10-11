import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuthActions, useSession } from '../lib/auth'
import { Logo } from './Logo'

const links = [
  { to: '/wipe', label: 'Wipe guides' },
  { to: '/recyclers', label: 'Find a recycler' },
  { to: '/collect', label: 'Kabadiwalas' },
  { to: '/ask', label: 'Ask' },
  { to: '/impact', label: 'Impact' },
]

function NavItem({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `px-3 py-2 text-sm transition-colors ${isActive ? 'text-ink font-medium' : 'text-ink-2 hover:text-ink'}`
      }
    >
      {label}
    </NavLink>
  )
}

function Account({ onNavigate }: { onNavigate?: () => void }) {
  const session = useSession()
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  if (session.isLoading) return <span className="h-9 w-24" />
  if (!session.data) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/signin" onClick={onNavigate} className="btn-ghost">
          Sign in
        </Link>
        <Link to="/drawer/add" onClick={onNavigate} className="btn-gold">
          Start
        </Link>
      </div>
    )
  }
  const groups = session.data.groups
  const roleLinks = [
    { group: 'partner', to: '/partner', label: 'Partner' },
    { group: 'processor', to: '/processor', label: 'Facility' },
    { group: 'admin', to: '/admin', label: 'Admin' },
  ].filter((r) => groups.includes(r.group))
  return (
    <div className="flex flex-wrap items-center gap-2">
      {roleLinks.map((r) => (
        <Link key={r.to} to={r.to} onClick={onNavigate} className="btn-ghost px-3">
          {r.label}
        </Link>
      ))}
      <Link to="/drawer" onClick={onNavigate} className="btn-primary">
        My drawer
      </Link>
      <button
        type="button"
        title="Sign out"
        className="btn-ghost px-2.5"
        onClick={async () => {
          await signOut()
          onNavigate?.()
          navigate('/')
        }}
      >
        <LogOut className="size-4" />
        <span className="sr-only">Sign out</span>
      </button>
    </div>
  )
}

export function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="SafeDrop eWaste home">
            <Logo />
          </Link>
          <nav className="hidden items-center md:flex">
            {links.map((l) => (
              <NavItem key={l.to} {...l} />
            ))}
          </nav>
          <div className="hidden md:block">
            <Account />
          </div>
          <button type="button" className="btn-ghost px-2.5 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-line bg-paper px-4 pb-4 md:hidden">
            <nav className="flex flex-col py-2">
              {links.map((l) => (
                <NavItem key={l.to} {...l} onClick={() => setOpen(false)} />
              ))}
            </nav>
            <Account onNavigate={() => setOpen(false)} />
          </div>
        )}
      </header>
      <main key={pathname} className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-ink-2">Wipe it. Drop it. Done. Old electronics, handed over safely to registered recyclers.</p>
          </div>
          <div className="space-y-2 text-sm text-ink-2">
            <p className="eyebrow">Data</p>
            <p>
              Recyclers and refurbishers from the{' '}
              <a className="link" href="https://eprewaste.cpcb.gov.in/" target="_blank" rel="noreferrer">
                CPCB E-Waste EPR portal
              </a>
              . Wipe steps from official Google, Apple, Samsung, Microsoft and NIST pages. Impact factors from US EPA WARM v16.
            </p>
            <Link to="/impact#method" className="link">
              Method and sources
            </Link>
          </div>
          <div className="space-y-2 text-sm text-ink-2">
            <p className="eyebrow">Built on AWS</p>
            <p>Amplify Hosting · Lambda · API Gateway · DynamoDB · S3 · Cognito · Amazon Location Service · Rekognition · CDK</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
