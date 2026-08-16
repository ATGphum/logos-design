import { useId } from 'react'
import type { BillingPaymentMethod, BillingPlan } from '../../billingTypes'
import { billingPricePresentation } from '../../billingPricing'
import { pageText } from '../../i18n/pageText'

export function BillingPriceSummary({ plan, method, compact = false }: {
  plan: BillingPlan
  method: BillingPaymentMethod | null
  compact?: boolean
}) {
  const price = billingPricePresentation(plan, method)
  const titleID = useId()

  return (
    <section className={`billing-price-summary ${compact ? 'billing-price-summary--compact' : ''}`} aria-labelledby={titleID} aria-live="polite" aria-atomic="true">
      <h3 id={titleID}>{pageText('billing.billingPriceSummary.orderSummary')}</h3>
      <dl>
        <div><dt>{pageText('billing.billingPriceSummary.term')}</dt><dd>{price.termLabel}</dd></div>
        <div><dt>{pageText('billing.billingPriceSummary.monthlyEquivalent')}</dt><dd>{price.monthlyEquivalentLabel}</dd></div>
        <div className="billing-price-summary__total"><dt>{pageText('billing.billingPriceSummary.totalDue')}</dt><dd>{price.totalDueLabel}</dd></div>
      </dl>
      <div className={`billing-renewal-disclosure billing-renewal-disclosure--${price.renewalKind}`}>
        <strong>{price.renewalLabel}</strong>
        <p>{price.renewalDescription}</p>
      </div>
      <small>{pageText('billing.billingPriceSummary.termMonthlyEquivalentAndTotalDueAreDisplayedExactly')}</small>
    </section>
  )
}
