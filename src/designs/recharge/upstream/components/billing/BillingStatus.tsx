import { Check, Circle, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react'
import { billingOrderRecovery } from '../../billingRecovery'
import type { BillingOrderStatus } from '../../billingTypes'
import { billingOrderActivated } from '../../hooks/billing/billingPollingPolicy'
import { pageText } from '../../i18n/pageText'

const providerSteps = () => ({
  stripe: [pageText('billing.billingStatus.paymentSubmitted'), pageText('billing.billingStatus.confirmingWithStripe'), pageText('billing.billingStatus.paymentConfirmed'), pageText('billing.billingStatus.proAccessActivated')],
})

function completedCount(status: BillingOrderStatus | null) {
  if (!status) return 0
  if (billingOrderActivated(status)) return 4
  if (status.status === 'paid') return 3
  if (status.status === 'confirming') return 2
  if (status.status === 'submitted') return 1
  return 0
}

export function BillingStatus({ status, error, loading, onRefresh, onStartNewAttempt, providerHint }: {
  status: BillingOrderStatus | null
  error: string
  loading: boolean
  onRefresh: () => void
  onStartNewAttempt?: () => void
  providerHint?: 'stripe'
}) {
  const done = completedCount(status)
  const recovery = billingOrderRecovery(status)
  const warning = recovery.tone === 'warning'
  return (
    <section className="billing-status" aria-label={pageText('billing.billingStatus.paymentStatus')} aria-live="polite" aria-busy={loading}>
      <div className="billing-status__head">
        <div>
          <span className={`billing-status__icon ${done === 4 ? 'is-success' : warning ? 'is-warning' : ''}`}>
            {done === 4 ? <ShieldCheck size={20} /> : warning ? <TriangleAlert size={20} /> : <LoaderCircle size={20} />}
          </span>
          <span><b>{recovery.title}</b><small>{pageText('billing.billingStatus.order')} {status?.orderNo || pageText('billing.billingStatus.statusWillAppearHere')}</small></span>
        </div>
        <div className="billing-status__actions">
          <button type="button" onClick={onRefresh} disabled={loading}>{loading ? pageText('billing.billingStatus.checking') : pageText('billing.billingStatus.refresh')}</button>
          {recovery.canStartNewAttempt && onStartNewAttempt ? <button type="button" onClick={onStartNewAttempt} disabled={loading}>{pageText('billing.billingStatus.startANewPayment')}</button> : null}
        </div>
      </div>
      <ol className="billing-status__timeline">
        {providerSteps()[status?.provider ?? providerHint ?? 'stripe'].map((step, index) => (
          <li className={index < done ? 'is-complete' : index === done && !warning ? 'is-current' : ''} key={step}>
            {index < done ? <Check size={14} /> : <Circle size={14} />}<span>{step}</span>
          </li>
        ))}
      </ol>
      {status?.failure ? <p className="billing-error" role="alert">{status.failure.message}</p> : null}
      {error ? <p className="billing-error" role="alert">{error}</p> : null}
      <p className={warning ? 'billing-warning-note' : 'billing-inline-note'}>{recovery.detail}</p>
      <p className="billing-inline-note">{pageText('billing.billingStatus.accessChangesOnlyAfterTheServerVerifiesTheProvider')}</p>
    </section>
  )
}
