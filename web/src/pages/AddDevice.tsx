import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Camera, Check, ImageUp, Loader2, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { BatterySafety } from '../components/BatterySafety'
import { RequireAuth } from '../components/RequireAuth'
import { ErrorNote, Page, PageHeader, Picture } from '../components/ui'
import { api, errorText } from '../lib/api'
import { dataKinds, guideFor, kindLabels, useGuides } from '../lib/data'
import { compressImage } from '../lib/image'
import type { Device, DeviceKind, Identification } from '../lib/types'

const guideKind: Record<string, DeviceKind> = {
  android: 'phone',
  samsung: 'phone',
  iphone: 'phone',
  windows: 'laptop',
  mac: 'laptop',
  chromebook: 'laptop',
  'feature-phone': 'feature-phone',
  storage: 'storage',
  'tv-router-printer': 'router',
}

const engineName = { bedrock: 'Amazon Bedrock', gemini: 'Gemini vision', rekognition: 'Amazon Rekognition' }

function AddDeviceForm() {
  const [params] = useSearchParams()
  const presetGuide = params.get('guide')
  const navigate = useNavigate()
  const client = useQueryClient()
  const guides = useGuides()
  const fileInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<Identification | null>(null)
  const [kind, setKind] = useState<DeviceKind>(presetGuide ? guideKind[presetGuide] ?? 'phone' : 'phone')
  const [brand, setBrand] = useState(presetGuide === 'samsung' ? 'Samsung' : presetGuide === 'iphone' || presetGuide === 'mac' ? 'Apple' : '')
  const [model, setModel] = useState('')
  const [guideId, setGuideId] = useState<string>(presetGuide ?? '')

  const suggestedGuide = guideFor(kind, brand, result?.os)
  const effectiveGuide = dataKinds.includes(kind) ? guideId || suggestedGuide : null

  async function scan(file: File) {
    setScanError('')
    setResult(null)
    setScanning(true)
    setPreview(URL.createObjectURL(file))
    try {
      const blob = await compressImage(file)
      const upload = await api<{ key: string; url: string }>('/me/photos', { method: 'POST', json: { contentType: 'image/jpeg' } })
      const put = await fetch(upload.url, { method: 'PUT', body: blob, headers: { 'content-type': 'image/jpeg' } })
      if (!put.ok) throw new Error('Photo upload failed. Please try again.')
      const id = await api<Identification>('/me/photos/identify', { method: 'POST', json: { key: upload.key } })
      setResult(id)
      setKind(id.kind)
      setBrand(id.brand ?? '')
      setModel(id.model ?? '')
      setGuideId(id.guideId ?? '')
    } catch (err) {
      setScanError(errorText(err))
    } finally {
      setScanning(false)
    }
  }

  const save = useMutation({
    mutationFn: () =>
      api<Device>('/me/devices', {
        method: 'POST',
        json: { kind, brand, model, guideId: effectiveGuide, os: result?.os, identification: result ?? undefined },
      }),
    onSuccess: (device) => {
      client.invalidateQueries({ queryKey: ['devices'] })
      navigate(`/drawer/${device.id}`)
    },
  })

  const risky = result && (result.batteryRisk === 'likely' || result.batteryRisk === 'possible')

  return (
    <Page>
      <PageHeader
        eyebrow="Add a device"
        title="What’s in your drawer?"
        intro="Take a photo and SafeDrop identifies the device and picks the right wipe guide. Photos are deleted automatically after 7 days."
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="relative aspect-[4/3] bg-paper">
              {preview ? (
                <img src={preview} alt="Your device" className="h-full w-full object-contain" />
              ) : (
                <Picture name="step-scan" alt="Photographing an old cracked phone" className="h-full w-full" />
              )}
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
                  <Loader2 className="size-8 animate-spin text-sky-500" />
                  <p className="text-sm font-medium">Identifying your device…</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line p-4">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) scan(file)
                  e.target.value = ''
                }}
              />
              <button type="button" className="btn-sky flex-1" disabled={scanning} onClick={() => fileInput.current?.click()}>
                <Camera className="size-4" /> {preview ? 'Scan another photo' : 'Take or upload a photo'}
              </button>
            </div>
          </div>
          {scanError && <ErrorNote>{scanError} You can still fill in the details by hand.</ErrorNote>}
          {result && (
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-gold-500" /> {kindLabels[result.kind]}
                  {result.brand ? ` · ${result.brand}` : ''}
                  {result.model ? ` ${result.model}` : ''}
                </p>
                <span className="font-mono text-[11px] text-ink-3">{Math.round(result.confidence * 100)}% sure</span>
              </div>
              {result.notes && <p className="mt-2 text-sm text-ink-2">{result.notes}</p>}
              {result.damage.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.damage.map((d) => (
                    <span key={d} className="chip">{d}</span>
                  ))}
                </div>
              )}
              {result.labels && <p className="mt-3 text-xs text-ink-3">Labels seen: {result.labels.join(', ')}</p>}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">Identified by {engineName[result.engine]} · please check below</p>
            </div>
          )}
          {risky && (
            <div className="card border-ember-400 p-5">
              <p className="flex items-center gap-2 font-semibold text-ember-700">
                <AlertTriangle className="size-4" /> The battery may be swollen
              </p>
              <BatterySafety />
            </div>
          )}
        </div>

        <form
          className="card space-y-5 p-6 lg:self-start"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ImageUp className="size-4 text-sky-600" /> {result ? 'Confirm the details' : 'Or add it by hand'}
          </p>
          <div>
            <span className="label">Type of device</span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {(Object.keys(kindLabels) as DeviceKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKind(k)
                    setGuideId('')
                  }}
                  className={`flex items-center gap-1.5 border px-2.5 py-2 text-left text-xs transition-colors ${
                    kind === k ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:border-ink-3'
                  }`}
                >
                  {kind === k && <Check className="size-3 shrink-0" />} {kindLabels[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="brand">Brand</label>
              <input id="brand" className="field" maxLength={40} placeholder="e.g. Samsung" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="model">Model (optional)</label>
              <input id="model" className="field" maxLength={60} placeholder="e.g. Galaxy M31" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>
          {dataKinds.includes(kind) ? (
            <div>
              <label className="label" htmlFor="guide">Wipe guide</label>
              <select id="guide" className="field" value={effectiveGuide ?? ''} onChange={(e) => setGuideId(e.target.value)}>
                {guides.data?.guides
                  .filter((g) => g.id !== 'india-phone-extras')
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <p className="border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-700">No personal data on this kind of item. It will be ready to drop straight away.</p>
          )}
          {save.isError && <ErrorNote>{errorText(save.error)}</ErrorNote>}
          <button type="submit" className="btn-gold w-full py-3" disabled={save.isPending || scanning}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />} Add to my drawer
          </button>
        </form>
      </div>
    </Page>
  )
}

export default function AddDevice() {
  return <RequireAuth>{() => <AddDeviceForm />}</RequireAuth>
}
