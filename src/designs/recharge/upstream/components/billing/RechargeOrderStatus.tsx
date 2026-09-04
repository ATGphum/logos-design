import { Check, Circle, Clock3, LoaderCircle, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { formatBillingCreditUSD, formatBillingPaidUSD } from '../../billingTypes'
import { billingTopupPollingDecision, type BillingTopupOrderStatus } from '../../topupTypes'
import { pageText } from '../../i18n/pageText'

function statusCopy(status: BillingTopupOrderStatus | null) {
  if (status === null) return {
    title: pageText('billing.rechargeOrderStatus.recoveringActiveRecharge'),
    detail: pageText('billing.rechargeOrderStatus.checkingTheExistingOrderBeforeAnyNewPaymentCan'),
    tone: 'pending',
  } as const
  if (status.status === 'paid' && status.creditStatus === 'credited') return {
    title: pageText('billing.rechargeOrderStatus.creditAdded'), detail: pageText('billing.rechargeOrderStatus.theFinalizedPaymentAndUniqueLedgerCreditHaveBoth'), tone: 'success',
  } as const
  if (status.status === 'manual_review') return {
    title: pageText('billing.rechargeOrderStatus.manualReviewRequired'), detail: pageText('billing.rechargeOrderStatus.noCreditWasAddedWaitForBillingReview'), tone: 'warning',
  } as const
  if (status.status === 'refunded') return {
    title: pageText('billing.rechargeOrderStatus.rechargeRefunded'), detail: pageText('billing.rechargeOrderStatus.theOriginalCreditWasReversedByARecordedRefund'), tone: 'warning',
  } as const
  if (['failed', 'expired', 'underpaid', 'overpaid', 'canceled'].includes(status.status)) return {
    title: pageText('billing.rechargeOrderStatus.rechargeWasNotCredited'), detail: pageText('billing.rechargeOrderStatus.thisOrderReachedATerminalStateWithoutAddingCredit'), tone: 'warning',
  } as const
  if (status.status === 'submitted' || status.status === 'confirming') return {
    title: pageText('billing.rechargeOrderStatus.verifyingPayment'), detail: pageText('billing.rechargeOrderStatus.waitingForProviderConfirmationAndLedgerCredit'), tone: 'pending',
  } as const
  return {
    title: pageText('billing.rechargeOrderStatus.rechargePaymentStarted'), detail: pageText('billing.rechargeOrderStatus.thisOrderIsActiveCompleteOnlyThisPaymentAnd'), tone: 'pending',
  } as const
}

function completedSteps(status: BillingTopupOrderStatus | null) {
  if (status === null) return 0
  if (status.creditStatus === 'credited') return 4
  if (status.paymentStatus === 'succeeded') return 3
  if (status.status === 'submitted' || status.status === 'confirming') return 2
  return 1
}

export function RechargeOrderStatus({
  orderID,
  status,
  error,
  loading,
  canStartAnother,
  cancelAvailable,
  canceling,
  cancelError,
  onRefresh,
  onStartAnother,
  onCancel,
}: {
  orderID: string
  status: BillingTopupOrderStatus | null
  error: string
  loading: boolean
  canStartAnother: boolean
  cancelAvailable: boolean
  canceling: boolean
  cancelError: string
  onRefresh: () => void
  onStartAnother: () => void
  onCancel: () => void
}) {
  const copy = statusCopy(status)
  const done = completedSteps(status)
  const decision = status === null ? 'continue' : billingTopupPollingDecision(status)
  const steps = [pageText('billing.rechargeOrderStatus.orderCreated'), pageText('dynamic.billing.referenceSubmitted'), pageText('dynamic.billing.paymentFinalized'), pageText('dynamic.billing.creditAdded')]
  return (
    <section className={`recharge-order-status recharge-order-status--${copy.tone} cs-sec`} aria-labelledby="recharge-order-status-title" aria-busy={loading}>
      <header>
        <span className="recharge-order-status__icon">
          {copy.tone === 'success' ? <ShieldCheck size={24} aria-hidden="true" /> : copy.tone === 'warning' ? <ShieldAlert size={24} aria-hidden="true" /> : <Clock3 size={24} aria-hidden="true" />}
        </span>
        <div><small>{pageText('billing.rechargeOrderStatus.activeOrder')}</small><h2 id="recharge-order-status-title">{copy.title}</h2><p>{copy.detail}</p></div>
        <span className={`billing-status-pill billing-status-pill--${copy.tone === 'success' ? 'active' : 'pending'}`}>{loading ? pageText('billing.rechargeOrderStatus.checking') : status?.creditStatus === 'credited' ? pageText('billing.rechargeOrderStatus.ledgerVerified') : pageText('billing.rechargeOrderStatus.serverStatus')}</span>
      </header>
      <div className="recharge-order-status__summary">
        <span><small>{pageText('billing.rechargeOrderStatus.order')}</small><code>{status?.orderNo ?? orderID}</code></span>
        {status ? <><span><small>{pageText('billing.rechargeOrderStatus.pay')}</small><strong>{formatBillingPaidUSD(status.paidMicros)}</strong></span><span><small>{pageText('billing.rechargeOrderStatus.credit')}</small><strong>{formatBillingCreditUSD(status.creditedNanos)}</strong></span></> : null}
      </div>
      <ol className="recharge-order-status__steps" aria-label={pageText('billing.rechargeOrderStatus.rechargeVerificationProgress')}>
        {steps.map((step, index) => <li className={index < done ? 'is-complete' : index === done && decision === 'continue' ? 'is-current' : ''} key={step}>
          {index < done ? <Check size={15} aria-hidden="true" /> : index === done && loading ? <LoaderCircle className="billing-spin" size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
          <span>{step}</span>
        </li>)}
      </ol>
      {error ? <div className="billing-recovery recharge-order-status__error" role="alert"><strong>{pageText('billing.rechargeOrderStatus.statusCouldNotBeVerified')}</strong><p>{error}</p><p>{pageText('billing.rechargeOrderStatus.theLastVerifiedStateRemainsVisibleDoNotSend')}</p></div> : null}
      {cancelError ? <div className="billing-recovery recharge-order-status__error" role="alert"><strong>{pageText('billing.rechargeOrderStatus.paymentCouldNotBeCanceled')}</strong><p>{cancelError}</p></div> : null}
      {status?.failure ? <p className="billing-error" role="alert">{status.failure.message}</p> : null}
      {status && decision === 'continue' && ['created', 'pending_payment'].includes(status.status) ? <p className="billing-inline-note">{pageText('billing.rechargeOrderStatus.ifThisPageWasReopenedUseTheOriginalExact')}</p> : null}
      {decision === 'continue' ? <p className="billing-inline-note"><strong>{pageText('billing.rechargeOrderStatus.duplicatePaymentProtection')}</strong>  {pageText('billing.rechargeOrderStatus.doNotCreateOrSendAnotherPaymentWhileThis')}</p> : null}
      <footer>
        {cancelAvailable ? <button className="cs-btn billing-danger-button" type="button" onClick={onCancel} disabled={loading || canceling}>{canceling ? <LoaderCircle className="billing-spin" size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}{canceling ? pageText('billing.rechargeOrderStatus.cancelingPayment') : pageText('billing.rechargeOrderStatus.cancelPayment')}</button> : null}
        <button className="cs-btn" type="button" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? 'billing-spin' : undefined} size={16} aria-hidden="true" />{loading ? pageText('billing.rechargeOrderStatus.checking2') : pageText('billing.rechargeOrderStatus.checkNow')}</button>
        {decision !== 'continue' && canStartAnother ? <button type="button" className="cs-btn pri is-primary" onClick={onStartAnother}>{pageText('billing.rechargeOrderStatus.startAnotherRecharge')}</button> : null}
      </footer>
    </section>
  )
}
