import { useState } from 'react'
import { ExternalLink, FileText, LoaderCircle, ReceiptText, RefreshCw } from 'lucide-react'
import { apiErrorMessage } from '../../api'
import { billingHistoryPresentation } from '../../billingHistoryPresentation'
import type { BillingHistory as BillingHistoryData, BillingPlan } from '../../billingTypes'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { pageText } from '../../i18n/pageText'
import { billingPlanName } from '../../billingCatalogText'

function date(value: string) {
  return formatDateTime(value)
}

function DateValue({ value }: { value: string }) {
  return <time dateTime={value}>{date(value)}</time>
}

export function BillingHistory({ history, plans, available, fresh = true, loading, onRetry, onOpenStripePortal }: {
  history: BillingHistoryData
  plans: BillingPlan[]
  available: boolean
  fresh?: boolean
  loading: boolean
  onRetry: () => void
  onOpenStripePortal: () => Promise<void>
}) {
  const [portalWorking, setPortalWorking] = useState(false)
  const [portalError, setPortalError] = useState('')

  const openStripeReceipts = async () => {
    setPortalWorking(true)
    setPortalError('')
    try {
      await onOpenStripePortal()
    } catch (error) {
      setPortalError(apiErrorMessage(error, pageText('dynamic.billing.receiptsUnavailable')))
    } finally {
      setPortalWorking(false)
    }
  }

  if (loading && history.items.length === 0) return (
    <section className="billing-empty" role="status" aria-live="polite">
      <LoaderCircle className="billing-spin" size={28} aria-hidden="true" />
      <h2>{pageText('billing.billingHistory.loadingBillingHistory')}</h2>
      <p>{pageText('billing.billingHistory.checkingYourOrdersPaymentsRefundsAndReceiptReferencesWith')}</p>
    </section>
  )
  if (!available) return (
    <section className="billing-empty billing-recovery" role="alert">
      <ReceiptText size={28} aria-hidden="true" />
      <h2>{pageText('billing.billingHistory.billingHistoryIsTemporarilyUnavailable')}</h2>
      <p>{pageText('billing.billingHistory.yourPaymentAndProAccessStateIsUnchangedRetry')}</p>
      <button type="button" onClick={onRetry} disabled={loading}><RefreshCw size={16} aria-hidden="true" />{loading ? pageText('billing.billingHistory.retrying') : pageText('billing.billingHistory.tryAgain')}</button>
    </section>
  )

  const views = billingHistoryPresentation(history, plans)
  if (views === null) return (
    <section className="billing-empty billing-recovery" role="alert">
      <ReceiptText size={28} aria-hidden="true" />
      <h2>{pageText('billing.billingHistory.billingHistoryCouldNotBeVerified')}</h2>
      <p>{pageText('billing.billingHistory.aHistoricalPlanNoLongerMatchesTheServerCatalog')}</p>
      <button type="button" onClick={onRetry} disabled={loading}><RefreshCw size={16} aria-hidden="true" />{pageText('billing.billingHistory.refreshHistory')}</button>
    </section>
  )
  if (views.length === 0) return (
    <section className="billing-empty">
      <ReceiptText size={28} aria-hidden="true" />
      <h2>{pageText('billing.billingHistory.noBillingHistoryYet')}</h2>
      <p>{pageText('billing.billingHistory.ordersVerifiedPaymentsFullRefundsStripeInvoiceRecordsAnd')}</p>
    </section>
  )

  return (
    <section className="billing-history-panel" aria-labelledby="billing-history-title" aria-busy={loading}>
      <header className="billing-history-panel__header">
        <div><span className="billing-eyebrow">{pageText('billing.billingHistory.ownerRecords')}</span><h2 id="billing-history-title">{pageText('billing.billingHistory.billingHistory')}</h2><p>{views.length}  {pageText('billing.billingHistory.mostRecent')} {views.length === 1 ? pageText('billing.billingHistory.order2') : pageText('billing.billingHistory.orders')}{pageText('billing.billingHistory.newestFirst')}</p></div>
        {loading ? <span className="billing-history-refresh" role="status"><LoaderCircle className="billing-spin" size={16} aria-hidden="true" />{pageText('billing.billingHistory.refreshingVerifiedRecords')}</span> : !fresh ? <span className="billing-history-refresh" role="status">{pageText('billing.billingHistory.lastVerifiedRecordsRefreshFailed')}</span> : null}
      </header>
      {portalError ? <p className="billing-inline-error" role="alert">{portalError}</p> : null}
      <div className="billing-history-wrap" role="region" aria-label={pageText('billing.billingHistory.billingHistoryOrders')} tabIndex={0}>
        <table className="billing-history">
          <caption className="billing-visually-hidden">{pageText('billing.billingHistory.orderPlanPaymentMethodAmountStatusEventDateAnd')}</caption>
          <thead><tr><th scope="col">{pageText('billing.billingHistory.order')}</th><th scope="col">{pageText('billing.billingHistory.plan')}</th><th scope="col">{pageText('billing.billingHistory.payment')}</th><th scope="col">{pageText('billing.billingHistory.amount')}</th><th scope="col">{pageText('billing.billingHistory.status')}</th><th scope="col">{pageText('billing.billingHistory.event')}</th><th scope="col">{pageText('billing.billingHistory.details')}</th></tr></thead>
          <tbody>{views.map((view) => (
            <tr key={view.item.orderId}>
              <td data-label={pageText('billing.billingHistory.order')}><b>{view.item.orderNo}</b><small>{view.item.orderId}</small></td>
              <td data-label={pageText('billing.billingHistory.plan')}><b>{billingPlanName(view.plan)}</b><small>{view.renewalLabel}</small></td>
              <td data-label={pageText('billing.billingHistory.payment')}><span className="billing-provider">{view.providerLabel}</span></td>
              <td data-label={pageText('billing.billingHistory.amount')}><b>{formatCurrency(Number(view.item.amountUSD), 'USD')}</b><small>{pageText('billing.billingHistory.usd')}</small></td>
              <td data-label={pageText('billing.billingHistory.status')}><span className={`billing-state billing-state--${view.item.status}`}>{view.statusLabel}</span><small>{view.refundLabel}</small></td>
              <td data-label={pageText('billing.billingHistory.event')}><small>{view.dateLabel}</small><DateValue value={view.date} /></td>
              <td data-label={pageText('billing.billingHistory.details')}>
                <details className="billing-history-details">
                  <summary>{pageText('billing.billingHistory.viewDetails')}</summary>
                  <div className="billing-history-details__content">
                    <dl>
                      <div><dt>{pageText('billing.billingHistory.orderReference')}</dt><dd>{view.item.orderId}</dd></div>
                      <div><dt>{pageText('billing.billingHistory.orderCreated')}</dt><dd><DateValue value={view.item.createdAt} /></dd></div>
                      <div><dt>{pageText('billing.billingHistory.paymentMethod')}</dt><dd>{view.providerLabel}</dd></div>
                      <div><dt>{pageText('billing.billingHistory.purchaseType')}</dt><dd>{view.renewalLabel}</dd></div>
                      <div><dt>{pageText('billing.billingHistory.refundStatus')}</dt><dd>{view.refundLabel}</dd></div>
                      {view.item.refundedAt ? <div><dt>{pageText('billing.billingHistory.refunded')}</dt><dd><DateValue value={view.item.refundedAt} /></dd></div> : null}
                    </dl>
                    <section aria-label={pageText('billing.billingHistory.paymentRecordsForOrder', { order: view.item.orderNo })}>
                      <h3>{pageText('billing.billingHistory.relatedPaymentRecords')}</h3>
                      {view.payments.length === 0 ? <p className="billing-muted">{pageText('billing.billingHistory.noProviderPaymentRecordHasBeenStoredForThis')}</p> : (
                        <ul>{view.payments.map((payment) => (
                          <li key={payment.payment.paymentId}>
                            <div><FileText size={16} aria-hidden="true" /><span><b>{payment.kindLabel}</b><small>{payment.payment.paymentId}</small></span><em className={`billing-state billing-state--${payment.payment.status}`}>{payment.statusLabel}</em></div>
                            <p>{payment.eventLabel}: <DateValue value={payment.eventAt} /></p>
                            {payment.payment.kind === 'stripe_invoice' ? <p>{pageText('billing.billingHistory.stripeInvoiceEvidenceIsStoredWithoutExposingProviderIdentifiers')}</p> : null}
                            {payment.canViewStripeReceipt ? <button type="button" onClick={() => void openStripeReceipts()} disabled={!fresh || portalWorking}>{portalWorking ? pageText('billing.billingHistory.openingStripe') : pageText('billing.billingHistory.viewStripeReceipts')}</button> : null}
                            {payment.payment.kind === 'stripe_invoice' && !payment.canViewStripeReceipt ? <p className="billing-muted">{pageText('billing.billingHistory.theSecureStripeReceiptPortalIsNotEnabledRight')}</p> : null}
                            {payment.payment.transactionURL ? <a href={payment.payment.transactionURL} target="_blank" rel="noreferrer" aria-label={pageText('billing.billingHistory.viewTaoTransactionForOrder', { order: view.item.orderNo })}>{pageText('billing.billingHistory.viewFinalizedTransaction')}<ExternalLink size={13} aria-hidden="true" /></a> : null}
                          </li>
                        ))}</ul>
                      )}
                    </section>
                  </div>
                </details>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}
