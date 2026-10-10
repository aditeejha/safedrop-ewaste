export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#15171C" />
      <path d="M32 10c0 0-15 16.5-15 27a15 15 0 0 0 30 0C47 26.5 32 10 32 10z" fill="#F7B500" />
      <path d="M25 37.5l5 5 9.5-10" fill="none" stroke="#15171C" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-none">
        <span className="block text-[17px] font-semibold tracking-tight text-ink">SafeDrop</span>
        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-sky-700">eWaste</span>
      </span>
    </span>
  )
}
