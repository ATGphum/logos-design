import { CheckCircle2, Orbit, ReceiptText } from 'lucide-react'
import { formatBillingCreditUSD } from '../../billingTypes'
import type { BillingTopupOrderStatus } from '../../topupTypes'
import { pageText } from '../../i18n/pageText'

export function RechargeSuccess({ status, canStartAnother, onStartAnother, onViewHistory }: {
  status: BillingTopupOrderStatus
  canStartAnother: boolean
  onStartAnother: () => void
  onViewHistory: () => void
}) {
  if (status.status !== 'paid' || status.creditStatus !== 'credited' || status.credit === null) return null
  return (
    <section className="recharge-success cs-sec" role="status" aria-live="polite" aria-atomic="true">
      <CheckCircle2 size={48} aria-hidden="true" />
      <span className="billing-eyebrow">{pageText('billing.rechargeSuccess.ledgerVerified')}</span>
      <h2>{pageText('billing.rechargeSuccess.rechargeComplete')}</h2>
      <p>{pageText('billing.rechargeSuccess.theFinalizedPaymentAddedCreditExactlyOnce')}</p>
      <div className="recharge-success__balance"><small>{pageText('billing.rechargeSuccess.availableBalance')}</small><strong>{formatBillingCreditUSD(status.credit.balanceNanos)}</strong></div>
      <dl>
        <div><dt>{pageText('billing.rechargeSuccess.creditAdded')}</dt><dd>{formatBillingCreditUSD(status.credit.amountNanos)}</dd></div>
        <div><dt>{pageText('billing.rechargeSuccess.order')}</dt><dd><code>{status.orderNo}</code></dd></div>
        <div><dt>{pageText('billing.rechargeSuccess.payment')}</dt><dd>{pageText('billing.rechargeSuccess.cardSucceeded')}</dd></div>
        <div><dt>{pageText('billing.rechargeSuccess.ledgerEntry')}</dt><dd><code>{status.credit.ledgerEntryId}</code></dd></div>
      </dl>
      <div>
        <button className="recharge-success__action cs-btn" type="button" onClick={onViewHistory}><ReceiptText size={16} aria-hidden="true" />{pageText('billing.rechargeSuccess.viewHistory')}</button>
        <button
          type="button"
          className="recharge-success__action cs-btn pri is-primary"
          onClick={onStartAnother}
          disabled={!canStartAnother}
          title={canStartAnother ? undefined : pageText('billing.rechargeSuccess.waitingForRechargeAvailabilityToRefresh')}
        >
          <Orbit size={16} aria-hidden="true" />{pageText('billing.rechargeSuccess.rechargeAgain')}
        </button>
      </div>
    </section>
  )
}
