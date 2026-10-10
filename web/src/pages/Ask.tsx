import { Link } from 'react-router'
import { AskBox } from '../components/AskBox'
import { Page, PageHeader, Picture } from '../components/ui'

const suggestions = [
  'How do I remove my Google account before resetting?',
  'How do I turn off Find My on an iPhone?',
  'What should I do with a swollen battery?',
  'पुराने फोन से UPI ऐप कैसे हटाएं?',
  'Is a factory reset enough for a laptop SSD?',
  'How do I back up WhatsApp chats?',
]

export default function Ask() {
  return (
    <Page>
      <PageHeader
        eyebrow="Ask SafeDrop"
        title="Questions about wiping or handing over a device?"
        intro="The assistant only answers from our ten official wipe guides and cites the source page, so it won’t invent menu paths. Ask in English or Hindi."
      />
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <AskBox suggestions={suggestions} />
        <div className="space-y-4">
          <Picture name="family-sorting" alt="A family sorting old phones and chargers at a dining table" className="aspect-[3/2] w-full border border-line" />
          <p className="text-sm text-ink-2">
            Prefer to read? Every answer comes from the <Link to="/wipe" className="link">wipe guides</Link>, which link to Google, Apple, Samsung,
            Microsoft, WhatsApp, NIST and US EPA pages.
          </p>
        </div>
      </div>
    </Page>
  )
}
