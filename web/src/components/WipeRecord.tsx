import { FileCheck2 } from 'lucide-react'
import { formatDate } from '../lib/data'
import type { WipeSummary } from '../lib/types'

export const attestationText =
  'I completed the critical steps on this device myself. I understand SafeDrop cannot check remotely that my data was erased.'

export function WipeRecordCard({ guideTitle, guideVersion, attestedAt, summary }: { guideTitle?: string; guideVersion: string; attestedAt?: string; summary?: WipeSummary }) {
  return (
    <div className="border border-line bg-white p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <FileCheck2 className="size-4 text-sky-600" aria-hidden="true" /> Wipe record
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ink-2">
        {guideTitle && (
          <>
            <dt className="text-ink-3">Guide</dt>
            <dd>{guideTitle}</dd>
          </>
        )}
        <dt className="text-ink-3">Version</dt>
        <dd className="font-mono text-xs">{guideVersion}</dd>
        {attestedAt && (
          <>
            <dt className="text-ink-3">Attested</dt>
            <dd>{formatDate(attestedAt)}</dd>
          </>
        )}
        {summary && (
          <>
            <dt className="text-ink-3">Steps</dt>
            <dd>
              {summary.done} done · {summary.na} didn’t apply · {summary.skipped} skipped (optional) · {summary.critical} critical
            </dd>
          </>
        )}
      </dl>
      <p className="mt-3 text-xs text-ink-3">
        Self-attested by the owner: “{attestationText}” SafeDrop never asks for passwords, PINs or OTPs, and does not verify erasure remotely.
      </p>
    </div>
  )
}
