import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BatteryWarning,
  CalendarCheck,
  Camera,
  ListChecks,
  LocateFixed,
  Lock,
  Map,
  MessageCircleQuestion,
  QrCode,
  RefreshCw,
  ScanLine,
  Smartphone,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router'
import { Picture, SourceLink, Stat } from '../components/ui'
import { api } from '../lib/api'
import { formatKg, formatKwh, ledHours, useFacts } from '../lib/data'
import type { Fact, Stats } from '../lib/types'

const steps = [
  {
    n: '01',
    title: 'Scan',
    image: 'orb-scan',
    tint: 'from-sky-100/80',
    border: 'hover:border-sky-400',
    dot: 'bg-sky-500',
    numberColor: 'text-sky-300',
    text: 'Snap a photo of the old device. AI tells you what it is, which wipe guide fits, and whether the battery looks swollen.',
    tags: ['Phones', 'Laptops', 'Tablets', 'Drives', 'Routers'],
  },
  {
    n: '02',
    title: 'Wipe',
    image: 'orb-wipe',
    tint: 'from-gold-100/80',
    border: 'hover:border-gold-400',
    dot: 'bg-gold-400',
    numberColor: 'text-gold-300',
    text: "Follow a checklist for your exact device, written from Google, Apple, Samsung and Microsoft's own help pages, plus UPI, WhatsApp and eSIM steps.",
    tags: ['Backup', 'Account lock', 'Factory reset', 'SIM & eSIM'],
  },
  {
    n: '03',
    title: 'Drop',
    image: 'orb-drop',
    tint: 'from-ember-50',
    border: 'hover:border-ember-400',
    dot: 'bg-ember-500',
    numberColor: 'text-ember-400/60',
    text: 'Find a CPCB-registered recycler or refurbisher on the map, book a drop-off and carry a QR handover code.',
    tags: ['573 registered sites', 'Pincode search', 'QR code'],
  },
  {
    n: '04',
    title: 'Proof',
    image: 'orb-certificate',
    tint: 'from-sky-50',
    border: 'hover:border-sky-300',
    dot: 'bg-sky-300',
    numberColor: 'text-sky-200',
    text: 'The recycler weighs and confirms. You get a certificate anyone can verify, with kg diverted, CO₂e avoided and energy saved.',
    tags: ['Verify link', 'Energy saved', 'EPA WARM'],
  },
]

const features = [
  { icon: Camera, title: 'AI device scan', text: 'Photo in, device type, brand and wipe guide out.' },
  { icon: BatteryWarning, title: 'Swollen battery check', text: 'Flags risky batteries and shows how to carry them safely.' },
  { icon: ListChecks, title: '10 official wipe guides', text: '104 steps, each linked to the maker’s own help page.' },
  { icon: Smartphone, title: 'India privacy steps', text: 'UPI apps, WhatsApp backup, eSIM, Find My Device.' },
  { icon: Lock, title: 'Lock-out alerts', text: 'Critical steps like Google FRP and Activation Lock can’t be skipped.' },
  { icon: MessageCircleQuestion, title: 'Ask SafeDrop', text: 'AI answers in English or Hindi, only from official steps, with sources.' },
  { icon: Map, title: 'Registered recycler map', text: 'Every CPCB-registered recycler and refurbisher, on Amazon Location maps.' },
  { icon: LocateFixed, title: 'Nearest first', text: 'Sort by distance from your GPS or pincode.' },
  { icon: BadgeCheck, title: 'Is it registered?', text: 'Check any recycler’s name against the CPCB list before you hand over.' },
  { icon: RefreshCw, title: 'Reuse first', text: 'Working devices can go to registered refurbishers instead.' },
  { icon: CalendarCheck, title: 'Drop-off or doorstep pickup', text: 'Carry devices to a drop point, or have a verified kabadiwala partner collect them.' },
  { icon: QrCode, title: 'QR handover code', text: 'One 6-character code links your wiped devices to the drop-off.' },
  { icon: ScanLine, title: 'Partner portals', text: 'Drop-point staff weigh and confirm; kabadiwala partners accept and log pickups.' },
  { icon: Award, title: 'Verifiable certificate', text: 'A public link proves the devices reached a registered recycler.' },
  { icon: Zap, title: 'Waste to energy saved', text: 'Kg diverted, CO₂e avoided and kWh saved versus mining new metals, from US EPA WARM v16.' },
]

function factById(facts: Fact[] | undefined, id: string) {
  return facts?.find((f) => f.id === id)
}

function LiveStats() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/stats'), staleTime: 30_000 })
  const s = stats.data
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
      <Stat value={s ? s.devicesWiped.toLocaleString('en-IN') : '…'} label="Devices wiped" hint="Live · SafeDrop" />
      <Stat value={s ? s.devicesRecycled.toLocaleString('en-IN') : '…'} label="Devices recycled" hint="Live · SafeDrop" />
      <Stat value={s ? formatKg(s.kgRecycled) : '…'} label="Kept out of landfill" hint="Weighed by recyclers" />
      <Stat value={s ? `${s.co2eKgAvoided.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg` : '…'} label="CO₂e avoided" hint="US EPA WARM v16" />
      <Stat value={s ? formatKwh(s.energyKwhSaved) : '…'} label="Energy saved" hint={s ? `= ${ledHours(s.energyKwhSaved).toLocaleString('en-IN')} h of a 9 W LED` : 'vs mining new metals'} />
      {s && s.demo.devicesRecycled > 0 && (
        <p className="col-span-full text-xs text-ink-3">
          Not counted above: {s.demo.devicesRecycled} demo handover{s.demo.devicesRecycled === 1 ? '' : 's'} made with the judges’ test account at the demo drop point.
        </p>
      )}
    </div>
  )
}

export default function Home() {
  const facts = useFacts()
  const generated = factById(facts.data, 'A1')
  const collected = factById(facts.data, 'A3')
  const kept = factById(facts.data, 'B1')
  const yougov = factById(facts.data, 'B7')
  const informal = factById(facts.data, 'A12')
  const who = factById(facts.data, 'G4')

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.05fr_1fr] md:py-20">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <span className="flex gap-1">
                <span className="size-2 bg-sky-500" />
                <span className="size-2 bg-gold-400" />
                <span className="size-2 bg-ember-500" />
              </span>
              Waste & Energy · India
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Your old phone still holds your life.
              <span className="block text-sky-600">Wipe it. Drop it. Done.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-2">
              SafeDrop walks you through wiping any old device with official steps, books a drop-off at a CPCB-registered recycler near you, and
              hands you a certificate anyone can verify.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/drawer/add" className="btn-gold px-5 py-3 text-[15px]">
                <Camera className="size-4" /> Scan an old device
              </Link>
              <Link to="/recyclers" className="btn-ghost px-5 py-3 text-[15px]">
                Find a recycler near me <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-5 text-xs text-ink-3">Free. No app to install. Works on any phone browser.</p>
          </div>
          <div className="relative">
            <Picture
              name="hero-drawer"
              alt="An open drawer full of old phones, chargers and a tablet (illustration)"
              className="aspect-[4/3] w-full border border-line"
              fallback={<HeroFallback />}
            />
            <div className="absolute -bottom-5 left-5 right-5 border border-line bg-white/95 p-4 shadow-[0_12px_30px_rgba(21,23,28,0.08)] backdrop-blur sm:left-auto sm:w-72">
              <p className="eyebrow">Delhi survey, 18–22 year olds</p>
              <p className="mt-2 text-sm text-ink">
                <span className="text-2xl font-semibold">{kept ? `${kept.value}%` : '46.5%'}</span> keep old phones at home. Only{' '}
                <span className="font-semibold">3.8%</span> take them to a recycling centre.
              </p>
              {kept && (
                <div className="mt-2">
                  <SourceLink href={kept.url}>Borthakur & Singh, 2022 (n=1,039)</SourceLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <p className="text-3xl font-semibold tracking-tight">{generated ? `${(Number(generated.value) / 1e6).toFixed(2)} million t` : '1.40 million t'}</p>
            <p className="mt-2 text-sm text-ink-2">E-waste India generated in FY 2024-25, as estimated by CPCB.</p>
            {generated && <SourceLink href={generated.url}>PIB, 11 Aug 2025</SourceLink>}
          </div>
          <div>
            <p className="text-3xl font-semibold tracking-tight">{collected ? `${collected.value}%` : '70.71%'}</p>
            <p className="mt-2 text-sm text-ink-2">Reported as collected, dismantled and recycled or disposed formally that year. The rest is unaccounted for.</p>
            {collected && <SourceLink href={collected.url}>PIB, 24 Jul 2025</SourceLink>}
          </div>
          <div>
            <p className="text-3xl font-semibold tracking-tight">{yougov ? `${yougov.value}%` : '26%'}</p>
            <p className="mt-2 text-sm text-ink-2">Of people keeping old phones worry about others accessing their data; 19% don’t know how to wipe it (UK survey).</p>
            {yougov && <SourceLink href={yougov.url}>YouGov, May 2024</SourceLink>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <Picture
            name="problem-informal"
            alt="Illustration of an informal e-waste yard with open burning"
            className="aspect-[16/10] w-full border border-line"
            fallback={<span className="font-mono text-xs uppercase tracking-widest text-ink-3">Informal e-waste yard · illustration</span>}
          />
          <div>
            <p className="eyebrow">01 / The problem</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Two fears keep devices in drawers. The rest leave the wrong way.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
              People don’t know how to erase their photos, chats and UPI apps, and they don’t know who will take an old phone safely. When devices do
              leave, many go to a scrap dealer and into informal yards.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-ink-2">
              {informal && (
                <li className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 bg-ember-500" />
                  <span>
                    The unorganised sector was handling more than 90% of India’s e-waste in 2011, the last official estimate.{' '}
                    <SourceLink href={informal.url}>Rajya Sabha, 2011</SourceLink>
                  </span>
                </li>
              )}
              {who && (
                <li className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 bg-ember-500" />
                  <span>
                    WHO: open burning and heating are the most hazardous informal e-waste activities, linked to lung damage and lead exposure in children.{' '}
                    <SourceLink href={who.url}>WHO, Oct 2024</SourceLink>
                  </span>
                </li>
              )}
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 bg-sky-500" />
                <span>Registered recyclers exist in 19 states, but people don’t know where they are or how to reach them.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">02 / How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Four steps from drawer to proof</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-ink-2 md:text-right">
              Each step works on its own. Use just the wipe guides, just the map, or the whole journey with a verified certificate at the end.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className={`card relative bg-gradient-to-b ${step.tint} to-white to-45% p-6 transition-colors ${step.border}`}>
                <div className="flex items-start justify-between">
                  <Picture name={step.image} alt="" className="size-16 bg-transparent object-contain" fallback={<span className={`size-10 rounded-full ${step.dot} opacity-70`} />} />
                  <span className={`font-mono text-3xl font-medium ${step.numberColor}`}>{step.n}</span>
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.text}</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {step.tags.map((tag) => (
                    <span key={tag} className="chip">
                      <span className={`size-1.5 ${step.dot}`} /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="eyebrow">03 / Everything in one place</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">15 things SafeDrop does for you</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">Sort it, wipe it, recycle it, and see the energy it saves: close the loop on the electronics a city throws away.</p>
        <div className="mt-10 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="flex gap-4 border-b border-r border-line bg-white p-5">
              <span className="font-mono text-[11px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-sky-600" />
                  <h3 className="text-[15px] font-semibold">{title}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">04 / Live impact</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Counted from real handovers, not estimates</h2>
            </div>
            <Link to="/impact" className="link hidden text-sm sm:block">
              How we count
            </Link>
          </div>
          <LiveStats />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 bg-ink p-8 text-white sm:p-12 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-300">Start with one device</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Empty one drawer this weekend.</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70">
              Most phone wipes take under 30 minutes. Your certificate shows exactly where the device went and what it was worth to the planet.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/drawer/add" className="btn-gold px-5 py-3">
              Scan a device
            </Link>
            <Link to="/wipe" className="btn border border-white/30 px-5 py-3 text-white hover:border-white">
              Browse wipe guides
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function HeroFallback() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
      <rect x="40" y="150" width="320" height="110" fill="#fff" stroke="#d6d1c4" />
      <rect x="40" y="150" width="320" height="18" fill="#fff0bf" stroke="#d6d1c4" />
      <rect x="185" y="200" width="30" height="6" fill="#d6d1c4" />
      <rect x="80" y="70" width="52" height="96" rx="8" fill="#15171c" transform="rotate(-12 106 118)" />
      <rect x="86" y="80" width="40" height="72" rx="3" fill="#79ccf7" transform="rotate(-12 106 118)" />
      <rect x="160" y="60" width="56" height="104" rx="9" fill="#15171c" transform="rotate(6 188 112)" />
      <rect x="166" y="70" width="44" height="80" rx="3" fill="#ffd24d" transform="rotate(6 188 112)" />
      <rect x="240" y="88" width="70" height="76" rx="6" fill="#4b5263" transform="rotate(-4 275 126)" />
      <rect x="247" y="95" width="56" height="58" rx="2" fill="#ecf7fe" transform="rotate(-4 275 126)" />
      <path d="M120 150 C 150 120, 200 175, 240 140 S 300 150, 330 125" fill="none" stroke="#8a90a0" strokeWidth="3" />
    </svg>
  )
}
