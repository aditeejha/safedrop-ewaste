import { Link } from 'react-router'
import { BatterySafety } from '../components/BatterySafety'
import { Page, PageHeader } from '../components/ui'

export default function BatteryPage() {
  return (
    <Page narrow>
      <PageHeader
        eyebrow="Battery safety"
        title="Swollen, hot or leaking battery?"
        intro="Lithium batteries that are damaged can catch fire. Don’t bring one to an ordinary drop-off: follow these steps and call the site first."
      />
      <div className="card p-6">
        <BatterySafety />
      </div>
      <p className="mt-6 text-sm text-ink-2">
        Steps from US EPA and US Fire Administration pages. In India, loose batteries are covered by the Battery Waste Management Rules, 2022, which ask consumers to
        discard them separately from other waste. <Link to="/recyclers" className="link">Find a registered recycler</Link> and ask whether they take damaged batteries.
      </p>
    </Page>
  )
}
