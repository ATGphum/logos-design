import { ArrowRight, CalendarDays, CheckCircle2, ReceiptText } from 'lucide-react'
import { billingSuccessPresentation } from '../../billingSuccessPresentation'
import type { BillingOrderStatus, BillingPlan } from '../../billingTypes'
import { formatDate } from '../../utils/format'
import { pageText } from '../../i18n/pageText'
import { billingPlanName } from '../../billingCatalogText'

function successDate(value: string) {
  return formatDate(value, { dateStyle: 'long' })
}

export function BillingSuccess({ status, plan, onBilling, onDone }: {
  status: BillingOrderStatus
  plan: BillingPlan
  onBilling: () => void
  onDone: () => void
}) {
  const localizedPlan = { ...plan, name: billingPlanName(plan) }
  const presentation = billingSuccessPresentation(status, localizedPlan)
  if (presentation === null) return null
  return (
    <section className="billing-success" role="status" aria-live="polite" aria-atomic="true">
      <CheckCircle2 size={48} aria-hidden="true" />
      <span className="billing-eyebrow">{pageText('billing.billingSuccess.paymentVerified')}</span>
      <h2>{presentation.headline}</h2>
      <p>{presentation.summary}</p>
      <dl aria-label={pageText('billing.billingSuccess.verifiedPurchaseDetails')}>
        <div><dt>{pageText('billing.billingSuccess.plan')}</dt><dd>{localizedPlan.name}</dd></div>
        <div><dt>{pageText('billing.billingSuccess.order')}</dt><dd>{status.orderNo}</dd></div>
        <div><dt>{pageText('billing.billingSuccess.payment')}</dt><dd>{presentation.providerLabel}</dd></div>
        <div><dt>{pageText('billing.billingSuccess.access')}</dt><dd>{presentation.accessLabel}</dd></div>
        <div><dt>{pageText('billing.billingSuccess.renewal')}</dt><dd>{presentation.renewalLabel}</dd></div>
        <div>
          <dt>{presentation.periodLabel}</dt>
          <dd><time dateTime={presentation.startsAt}>{successDate(presentation.startsAt)}</time><span aria-hidden="true"> – </span><time dateTime={presentation.expiresAt}>{successDate(presentation.expiresAt)}</time></dd>
        </div>
        <div><dt>{presentation.nextDateLabel}</dt><dd><time dateTime={presentation.nextDate}>{successDate(presentation.nextDate)}</time></dd></div>
      </dl>
      <p className="billing-success__renewal"><CalendarDays size={16} aria-hidden="true" />{presentation.renewalDetail}</p>
      <div><button type="button" onClick={onBilling}><ReceiptText size={16} />{pageText('billing.billingSuccess.viewBilling')}</button><button type="button" className="is-primary" onClick={onDone}>{pageText('billing.billingSuccess.returnToLogos')}<ArrowRight size={16} /></button></div>
    </section>
  )
}
