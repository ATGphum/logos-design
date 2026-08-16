import { useMemo, useState } from 'react'
import { ExternalLink, History, LoaderCircle, RefreshCw } from 'lucide-react'
import { formatBillingCreditUSD } from '../../billingTypes'
import type { BillingTopupHistory, BillingTopupHistoryItem } from '../../topupTypes'
import { formatDateTime } from '../../utils/format'
import { FilterSelect } from '../common/FilterSelect'
import type { FilterSelectOption } from '../common/FilterSelect'
import { pageText } from '../../i18n/pageText'

type StatusFilter = 'all' | 'credited' | 'refunded' | 'in_progress' | 'not_credited'
type ProviderFilter = 'all' | BillingTopupHistoryItem['provider']
type PeriodFilter = 'all' | '7' | '30' | '90'

const notCreditedStatuses = ['failed', 'expired', 'underpaid', 'overpaid', 'manual_review', 'canceled']

const statusOptions = (): readonly FilterSelectOption<StatusFilter>[] => [
  { value: 'all', label: pageText('billing.rechargeHistory.allStatuses') },
  { value: 'credited', label: pageText('billing.rechargeHistory.credited') },
  { value: 'refunded', label: pageText('billing.rechargeHistory.refunded') },
  { value: 'in_progress', label: pageText('billing.rechargeHistory.inProgress') },
  { value: 'not_credited', label: pageText('billing.rechargeHistory.notCredited') },
]
const providerOptions = (): readonly FilterSelectOption<ProviderFilter>[] => [
  { value: 'all', label: pageText('billing.rechargeHistory.allMethods') },
  { value: 'tao', label: pageText('billing.rechargeHistory.tao') },
  { value: 'stripe', label: pageText('billing.rechargeHistory.card') },
]
const periodOptions = (): readonly FilterSelectOption<PeriodFilter>[] => [
  { value: 'all', label: pageText('billing.rechargeHistory.allTime') },
  { value: '7', label: pageText('billing.rechargeHistory.last7Days') },
  { value: '30', label: pageText('billing.rechargeHistory.last30Days') },
  { value: '90', label: pageText('billing.rechargeHistory.last90Days') },
]

function date(value: string) {
  return formatDateTime(value)
}

function historyStatus(item: BillingTopupHistoryItem) {
  if (item.creditStatus === 'credited') return pageText('billing.rechargeHistory.credited')
  if (item.creditStatus === 'reversed') return pageText('billing.rechargeHistory.refunded')
  if (item.status === 'manual_review') return pageText('billing.rechargeHistory.manualReview')
  if (['submitted', 'confirming'].includes(item.status)) return pageText('billing.rechargeHistory.verifying')
  if (notCreditedStatuses.includes(item.status)) return pageText('billing.rechargeHistory.notCredited')
  return pageText('billing.rechargeHistory.paymentStarted')
}

function statusFilterValue(item: BillingTopupHistoryItem): Exclude<StatusFilter, 'all'> {
  if (item.creditStatus === 'credited') return 'credited'
  if (item.creditStatus === 'reversed') return 'refunded'
  if (notCreditedStatuses.includes(item.status)) return 'not_credited'
  return 'in_progress'
}

function historyEventAt(item: BillingTopupHistoryItem) {
  return item.refundedAt ?? item.credit?.creditedAt ?? item.createdAt
}

function ledgerStatus(item: BillingTopupHistoryItem) {
  if (item.credit !== null) return item.credit.refundEntryId ?? item.credit.ledgerEntryId
  if (item.status === 'expired') return pageText('billing.rechargeHistory.expired')
  if (item.status === 'canceled') return pageText('billing.rechargeHistory.canceled')
  if (['failed', 'underpaid', 'overpaid', 'manual_review'].includes(item.status)) return pageText('billing.rechargeHistory.notCredited')
  return pageText('billing.rechargeHistory.pending')
}

export function RechargeHistory({ history, available, fresh, loading, error, onRetry }: {
  history: BillingTopupHistory
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
  onRetry: () => void
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const filtersActive = statusFilter !== 'all' || providerFilter !== 'all' || periodFilter !== 'all'
  const filteredItems = useMemo(() => {
    const periodDays = periodFilter === 'all' ? null : Number(periodFilter)
    const earliestEvent = periodDays === null ? null : Date.now() - periodDays * 24 * 60 * 60 * 1000
    return history.items.filter((item) =>
      (statusFilter === 'all' || statusFilterValue(item) === statusFilter) &&
      (providerFilter === 'all' || item.provider === providerFilter) &&
      (earliestEvent === null || Date.parse(historyEventAt(item)) >= earliestEvent))
  }, [history.items, periodFilter, providerFilter, statusFilter])
  const resetFilters = () => {
    setStatusFilter('all')
    setProviderFilter('all')
    setPeriodFilter('all')
  }

  if (loading && history.items.length === 0) return <section className="billing-empty cs-sec" role="status"><LoaderCircle className="billing-spin" size={28} aria-hidden="true" /><h2>{pageText('billing.rechargeHistory.loadingRechargeHistory')}</h2><p>{pageText('billing.rechargeHistory.checkingOwnerOnlyOrderPaymentRefundAndLedgerRecords')}</p></section>
  if (!available && history.items.length === 0) return <section className="billing-empty billing-recovery cs-sec" role="alert"><History size={28} aria-hidden="true" /><h2>{pageText('billing.rechargeHistory.rechargeHistoryIsUnavailable')}</h2><p>{error || pageText('billing.rechargeHistory.noHistoryIsShownUntilTheServerResponseIs')}</p><button className="cs-btn" type="button" onClick={onRetry} disabled={loading}><RefreshCw size={16} aria-hidden="true" />{pageText('billing.rechargeHistory.tryAgain')}</button></section>
  return (
    <section className="recharge-history cs-sec" id="recharge-history" aria-labelledby="recharge-history-title" aria-busy={loading}>
      <header><div><span className="billing-eyebrow">{pageText('billing.rechargeHistory.ownerRecords')}</span><h2 id="recharge-history-title">{pageText('billing.rechargeHistory.rechargeHistory')}</h2><p>{pageText('billing.rechargeHistory.paymentsAndFullRefundsBackedByServerRecords')}</p></div><span className={`billing-status-pill billing-status-pill--${fresh ? 'active' : 'pending'}`}>{loading ? pageText('billing.rechargeHistory.refreshing') : fresh ? pageText('billing.rechargeHistory.verified') : pageText('billing.rechargeHistory.lastVerified')}</span></header>
      {error ? <div className="billing-recovery" role="alert"><p>{error}  {pageText('billing.rechargeHistory.previouslyVerifiedRecordsRemainVisible')}</p><button className="cs-btn" type="button" onClick={onRetry} disabled={loading}>{pageText('billing.rechargeHistory.retry')}</button></div> : null}
      {history.items.length === 0 ? <div className="recharge-history__empty"><History size={24} aria-hidden="true" /><strong>{pageText('billing.rechargeHistory.noRechargeHistoryYet')}</strong><span>{pageText('billing.rechargeHistory.completedAndPendingOneTimeRechargesWillAppearHere')}</span></div> : (
        <>
          <div className="recharge-history__filters" role="group" aria-label={pageText('billing.rechargeHistory.filterRechargeHistory')}>
            <FilterSelect testId="recharge-status-filter" label={pageText('billing.rechargeHistory.status')} value={statusFilter} options={statusOptions()} onChange={setStatusFilter} />
            <FilterSelect testId="recharge-provider-filter" label={pageText('billing.rechargeHistory.paymentMethod')} value={providerFilter} options={providerOptions()} onChange={setProviderFilter} />
            <FilterSelect testId="recharge-period-filter" label={pageText('billing.rechargeHistory.eventDate')} value={periodFilter} options={periodOptions()} onChange={setPeriodFilter} />
            <button className="cs-btn" type="button" onClick={resetFilters} disabled={!filtersActive}>{pageText('billing.rechargeHistory.clearFilters')}</button>
          </div>
          <p className="recharge-history__results" role="status" aria-live="polite">{pageText('billing.rechargeHistory.resultCount', { visible: filteredItems.length, total: history.items.length })}</p>
          {filteredItems.length === 0 ? <div className="recharge-history__empty"><History size={24} aria-hidden="true" /><strong>{pageText('billing.rechargeHistory.noMatchingRecharges')}</strong><span>{pageText('billing.rechargeHistory.tryChangingOrClearingTheCurrentFilters')}</span><button className="cs-btn" type="button" onClick={resetFilters}>{pageText('billing.rechargeHistory.clearFilters2')}</button></div> : <div className="recharge-history__list">{filteredItems.map((item) => {
          const eventAt = historyEventAt(item)
          return <article key={item.orderId}>
            <header><div><strong>{formatBillingCreditUSD(item.creditedMicros)}  {pageText('billing.rechargeHistory.credit')}</strong><small>{item.orderNo}</small></div><span className={`billing-state billing-state--${item.status}`}>{historyStatus(item)}</span></header>
            <dl>
              <div><dt>{pageText('billing.rechargeHistory.paid')}</dt><dd>{formatBillingCreditUSD(item.paidMicros)}  {pageText('billing.rechargeHistory.usd')}</dd></div>
              <div><dt>{pageText('billing.rechargeHistory.method')}</dt><dd>{item.provider === 'tao' ? pageText('billing.rechargeHistory.tao') : pageText('billing.rechargeHistory.card')}</dd></div>
              <div><dt>{pageText('billing.rechargeHistory.event')}</dt><dd><time dateTime={eventAt}>{date(eventAt)}</time></dd></div>
              <div><dt>{pageText('billing.rechargeHistory.ledger')}</dt><dd>{item.credit ? <code>{ledgerStatus(item)}</code> : ledgerStatus(item)}</dd></div>
            </dl>
            {item.creditStatus === 'reversed' ? <p className="billing-inline-note">{pageText('billing.rechargeHistory.fullRefundRecorded')} {formatBillingCreditUSD(item.creditedMicros)}  {pageText('billing.rechargeHistory.wasReversedFromTheBalance')}</p> : null}
            {item.payments.map((payment) => payment.transactionURL ? <a href={payment.transactionURL} target="_blank" rel="noreferrer" key={payment.paymentId}>{pageText('billing.rechargeHistory.viewFinalizedTaoTransaction')}<ExternalLink size={13} aria-hidden="true" /></a> : null)}
          </article>
        })}</div>}
        </>
      )}
    </section>
  )
}
