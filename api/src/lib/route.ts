// Reuse-first routing from the owner's own answers. A photo can't tell whether a device works,
// so missing answers lead to "not enough information" rather than a guess.
export type Condition = {
  powersOn?: 'yes' | 'no' | 'unknown'
  screenWorks?: 'yes' | 'no' | 'unknown'
  accountLocked?: 'yes' | 'no' | 'unknown'
  damage?: 'none' | 'minor' | 'major' | 'unknown'
  battery?: 'ok' | 'swollen' | 'unknown'
}

export type Route = 'battery-hazard' | 'reuse' | 'recycle' | 'not-enough-info'

const answers = {
  powersOn: ['yes', 'no', 'unknown'],
  screenWorks: ['yes', 'no', 'unknown'],
  accountLocked: ['yes', 'no', 'unknown'],
  damage: ['none', 'minor', 'major', 'unknown'],
  battery: ['ok', 'swollen', 'unknown'],
} as const

export function readCondition(raw: unknown): Condition {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const condition: Record<string, string> = {}
  for (const [key, allowed] of Object.entries(answers)) {
    const value = input[key]
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) condition[key] = value
  }
  return condition as Condition
}

export function decideRoute(condition: Condition | undefined, holdsData: boolean): { route: Route; reasons: string[] } {
  const c = condition ?? {}
  if (c.battery === 'swollen') {
    return { route: 'battery-hazard', reasons: ['The battery is swollen, hot or leaking, so it needs special handling before any drop-off.'] }
  }
  if (c.powersOn === 'no') return { route: 'recycle', reasons: ['The device does not switch on.'] }
  if (c.damage === 'major') return { route: 'recycle', reasons: ['The device has major damage.'] }
  const needed = holdsData ? (['powersOn', 'screenWorks', 'accountLocked', 'damage', 'battery'] as const) : (['powersOn', 'damage', 'battery'] as const)
  const missing = needed.filter((key) => !c[key] || c[key] === 'unknown')
  if (missing.length) return { route: 'not-enough-info', reasons: [`Answer ${missing.length} more question${missing.length > 1 ? 's' : ''} to get a recommendation.`] }
  if (c.accountLocked === 'yes') return { route: 'recycle', reasons: ['An account lock is still on, so nobody else can reuse it. Remove it to make reuse possible.'] }
  if (holdsData && c.screenWorks === 'no') return { route: 'recycle', reasons: ['The screen does not work.'] }
  return { route: 'reuse', reasons: ['It switches on, works and has no lock or major damage, so someone else could use it.'] }
}
