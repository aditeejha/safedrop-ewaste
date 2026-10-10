export type AppConfig = {
  region: string
  apiBase: string
  userPoolId: string
  userPoolClientId: string
  mapKey: string
}

let current: AppConfig | null = null

export async function loadConfig() {
  const res = await fetch('/config.json', { cache: 'no-store' })
  if (!res.ok) throw new Error('config.json is missing. Run the deploy script first.')
  current = (await res.json()) as AppConfig
  return current
}

export function config() {
  if (!current) throw new Error('Config not loaded')
  return current
}

export function mapStyleUrl() {
  const { region, mapKey } = config()
  return `https://maps.geo.${region}.amazonaws.com/v2/styles/Standard/descriptor?key=${mapKey}&color-scheme=Light&political-view=IND`
}
