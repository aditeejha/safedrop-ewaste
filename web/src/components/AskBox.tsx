import { useMutation } from '@tanstack/react-query'
import { ExternalLink, Loader2, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { api, errorText } from '../lib/api'
import type { Answer } from '../lib/types'
import { ErrorNote } from './ui'

const engineLabel = { bedrock: 'Amazon Bedrock', gemini: 'Gemini', search: 'Guide search' }

export function AskBox({ guideId, suggestions = [] }: { guideId?: string; suggestions?: string[] }) {
  const [question, setQuestion] = useState('')
  const ask = useMutation({
    mutationFn: (q: string) => api<Answer>('/ask', { method: 'POST', json: { question: q, guideId } }),
  })
  const submit = (q: string) => {
    const text = q.trim()
    if (text.length < 3) return
    setQuestion(text)
    ask.mutate(text)
  }
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-gold-500" />
        <p className="text-sm font-semibold">Ask SafeDrop</p>
      </div>
      <p className="mt-1 text-xs text-ink-3">Answers come only from the official steps, in English or Hindi.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit(question)
        }}
      >
        <input
          className="field"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How do I remove my Google account?"
          aria-label="Your question"
        />
        <button type="submit" className="btn-primary px-3" disabled={ask.isPending || question.trim().length < 3} aria-label="Ask">
          {ask.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
      {suggestions.length > 0 && !ask.data && !ask.isPending && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip hover:border-sky-400 hover:text-ink" onClick={() => submit(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {ask.isError && (
        <div className="mt-3">
          <ErrorNote>{errorText(ask.error)}</ErrorNote>
        </div>
      )}
      {ask.data && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{ask.data.answer}</p>
          {ask.data.sources.length > 0 && (
            <ul className="mt-3 space-y-1">
              {ask.data.sources.map((s, i) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline">
                    [{i + 1}] {s.publisher}: {s.title} <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">Answered by {engineLabel[ask.data.engine]}</p>
        </div>
      )}
    </div>
  )
}
