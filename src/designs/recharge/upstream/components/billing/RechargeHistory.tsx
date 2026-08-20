import { useMemo, useState } from 'react'
import { ChevronDown, History, LoaderCircle } from 'lucide-react'
import { formatBillingCreditUSD } from '../../billingTypes'
import type { CryptoDepositActivity } from '../../depositTypes'
import { pageText } from '../../i18n/pageText'
import type { BillingTopupHistory, BillingTopupHistoryItem } from '../../topupTypes'
import { formatDateTime } from '../../utils/format'
import { FilterSelect } from '../common/FilterSelect'
import type { FilterSelectOption } from '../common/FilterSelect'
import {
  CryptoDepositActivityCard,
} from './CryptoDepositActivity'
import {
  cryptoDepositHistoryPresentation,
  type CryptoDepositHistoryPresentationItem,
} from './rechargeHistoryPresentation'

type StatusFilter = 'all' | 'credited' | 'refunded' | 'in_progress' | 'not_credited'
type ProviderFilter = 'all' | BillingTopupHistoryItem['provider'] | 'crypto'
type PeriodFilter = 'all' | '7' | '30' | '90'

type TopupHistoryPresentationItem = Readonly<{
  key: `topup:${string}`
  source: 'topup_order'
  sourceID: string
  method: BillingTopupHistoryItem['provider']
  statusFilter: Exclude<StatusFilter, 'all'>
  eventAt: string
  item: BillingTopupHistoryItem
}>

type RechargeHistoryPresentationItem = TopupHistoryPresentationItem | CryptoDepositHistoryPresentationItem

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
  { value: 'crypto', label: pageText('billing.rechargeHistory.crypto') },
  { value: 'stripe', label: pageText('billing.rechargeHistory.card') },
]
const periodOptions = (): readonly FilterSelectOption<PeriodFilter>[] => [
  { value: 'all', label: pageText('billing.rechargeHistory.allTime') },
  { value: '7', label: pageText('billing.rechargeHistory.last7Days') },
  { value: '30', label: pageText('billing.rechargeHistory.last30Days') },
  { value: '90', label: pageText('billing.rechargeHistory.last90Days') },
]

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

function topupHistoryPresentation(history: BillingTopupHistory) {
  const orders = new Map<string, TopupHistoryPresentationItem>()
  for (const item of history.items) {
    if (orders.has(item.orderId)) continue
    orders.set(item.orderId, Object.freeze({
      key: `topup:${item.orderId}`,
      source: 'topup_order',
      sourceID: item.orderId,
      method: item.provider,
      statusFilter: statusFilterValue(item),
      eventAt: historyEventAt(item),
      item,
    }))
  }
  return [...orders.values()]
}

function TopupHistoryCard({ presentation }: { presentation: TopupHistoryPresentationItem }) {
  const { eventAt, item } = presentation
  /* DESIGN HANDOFF: one table row per payment — date / amount / status / link, matching the
     deposit rows. Paid-vs-credited split, method and ledger id are dropped; the amount
     credited and the status pill are what the list is scanned for. */
  return (
    <div className="rc-txrow" data-history-source={presentation.source} data-history-id={presentation.sourceID}>
      <time className="rc-txrow__date" dateTime={eventAt}>{formatDateTime(eventAt)}</time>
      <span className="rc-txrow__amount">{formatBillingCreditUSD(item.creditedNanos)}</span>
      <span className={`rc-txrow__status billing-state billing-state--${item.status}`}>{historyStatus(item)}</span>
      <span className="rc-txrow__action rc-txrow__action--none" aria-hidden="true">—</span>
    </div>
  )
}

function SourceRecovery({ title, error, retained, otherAvailable, loading, onRetry }: {
  title: string
  error: string
  retained: boolean
  otherAvailable: boolean
  loading: boolean
  onRetry: () => void
}) {
  return (
    <div className="billing-recovery recharge-history__source-recovery" role="alert">
      <strong>{title}</strong>
      <p>{error} {retained
        ? pageText('billing.rechargeHistory.previouslyVerifiedRecordsRemainVisible')
        : otherAvailable
          ? pageText('billing.rechargeHistory.otherHistorySourceRemainsAvailable')
          : pageText('billing.rechargeHistory.sourceHasNoVerifiedRecords')}</p>
      <button className="cs-btn" type="button" onClick={onRetry} disabled={loading}>{pageText('billing.rechargeHistory.retry')}</button>
    </div>
  )
}

export function RechargeHistory({
  history,
  available,
  fresh,
  loading,
  error,
  onRetry,
  depositActivity,
  depositAvailable,
  depositFresh,
  depositLoading,
  depositError,
  onDepositRetry,
  depositEnabled = true,
}: {
  history: BillingTopupHistory
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
  onRetry: () => void
  depositActivity: CryptoDepositActivity
  depositAvailable: boolean
  depositFresh: boolean
  depositLoading: boolean
  depositError: string
  onDepositRetry: () => void
  depositEnabled?: boolean
}) {
  // DESIGN HANDOFF: history starts open but folds away; it is rarely why you opened the page.
  const [historyOpen, setHistoryOpen] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const filtersActive = statusFilter !== 'all' || providerFilter !== 'all' || periodFilter !== 'all'
  const items = useMemo<readonly RechargeHistoryPresentationItem[]>(() => [
    ...topupHistoryPresentation(history),
    ...(depositEnabled ? cryptoDepositHistoryPresentation(depositActivity) : []),
  ].sort((left, right) => Date.parse(right.eventAt) - Date.parse(left.eventAt) || right.key.localeCompare(left.key)), [
    depositActivity,
    depositEnabled,
    history,
  ])
  const filteredItems = useMemo(() => {
    const periodDays = periodFilter === 'all' ? null : Number(periodFilter)
    const earliestEvent = periodDays === null ? null : Date.now() - periodDays * 24 * 60 * 60 * 1000
    return items.filter((item) =>
      (statusFilter === 'all' || item.statusFilter === statusFilter) &&
      (providerFilter === 'all' || item.method === providerFilter) &&
      (earliestEvent === null || Date.parse(item.eventAt) >= earliestEvent))
  }, [items, periodFilter, providerFilter, statusFilter])
  const overallLoading = loading || (depositEnabled && depositLoading)
  const overallFresh = fresh && (!depositEnabled || depositFresh)
  const allSourcesAvailable = available && (!depositEnabled || depositAvailable)
  const anySourceLoading = loading || (depositEnabled && depositLoading)
  const resetFilters = () => {
    setStatusFilter('all')
    setProviderFilter('all')
    setPeriodFilter('all')
  }

  return (
    <section className={`recharge-history cs-sec${historyOpen ? '' : ' recharge-history--folded'}`} id="recharge-history" aria-labelledby="recharge-history-title" aria-busy={overallLoading}>
      {/* DESIGN HANDOFF: header is a fold toggle — the list is long and rarely the reason
          you opened this page. Sub-description dropped for the same reason. */}
      <header
        className="recharge-history__header recharge-history__header--foldable"
        role="button"
        tabIndex={0}
        aria-expanded={historyOpen}
        aria-controls="recharge-history-body"
        onClick={() => setHistoryOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHistoryOpen((v) => !v) } }}
      ><div><span className="billing-eyebrow">{pageText('billing.rechargeHistory.ownerRecords')}</span><h2 id="recharge-history-title">{pageText('billing.rechargeHistory.rechargeHistory')}</h2></div><ChevronDown className="recharge-history__fold" size={18} aria-hidden="true" />{/* DESIGN HANDOFF: VERIFIED pill removed. */}</header>
      <div className="recharge-history__body" id="recharge-history-body" aria-hidden={!historyOpen}>
        <div className="recharge-history__bodyinner">
      {error ? <SourceRecovery title={pageText('billing.rechargeHistory.paymentHistoryUnavailable')} error={error} retained={history.items.length > 0} otherAvailable={depositEnabled && (depositAvailable || depositActivity.items.length > 0)} loading={loading} onRetry={onRetry} /> : null}
      {depositEnabled && depositError ? <SourceRecovery title={pageText('billing.rechargeHistory.depositActivityUnavailable')} error={depositError} retained={depositActivity.items.length > 0} otherAvailable={available || history.items.length > 0} loading={depositLoading} onRetry={onDepositRetry} /> : null}
      {items.length === 0 && anySourceLoading ? (
        <div className="recharge-history__empty" role="status"><LoaderCircle className="billing-spin" size={24} aria-hidden="true" /><strong>{pageText('billing.rechargeHistory.loadingRechargeHistory')}</strong><span>{pageText('billing.rechargeHistory.checkingPaymentsAndDepositActivity')}</span></div>
      ) : items.length === 0 && allSourcesAvailable ? (
        <div className="recharge-history__empty"><History size={24} aria-hidden="true" /><strong>{pageText('billing.rechargeHistory.noRechargeHistoryYet')}</strong><span>{pageText('billing.rechargeHistory.completedAndPendingRechargesWillAppearHere')}</span></div>
      ) : items.length > 0 ? (
        <>
          <div className="recharge-history__filters" role="group" aria-label={pageText('billing.rechargeHistory.filterRechargeHistory')}>
            <FilterSelect testId="recharge-status-filter" label={pageText('billing.rechargeHistory.status')} value={statusFilter} options={statusOptions()} onChange={setStatusFilter} />
            <FilterSelect testId="recharge-provider-filter" label={pageText('billing.rechargeHistory.paymentMethod')} value={providerFilter} options={providerOptions()} onChange={setProviderFilter} />
            <FilterSelect testId="recharge-period-filter" label={pageText('billing.rechargeHistory.eventDate')} value={periodFilter} options={periodOptions()} onChange={setPeriodFilter} />
            <button className="cs-btn" type="button" onClick={resetFilters} disabled={!filtersActive}>{pageText('billing.rechargeHistory.clearFilters')}</button>
          </div>
          <p className="recharge-history__results" role="status" aria-live="polite">{pageText('billing.rechargeHistory.resultCount', { visible: filteredItems.length, total: items.length })}</p>
          {filteredItems.length === 0 ? <div className="recharge-history__empty"><History size={24} aria-hidden="true" /><strong>{pageText('billing.rechargeHistory.noMatchingRecharges')}</strong><span>{pageText('billing.rechargeHistory.tryChangingOrClearingTheCurrentFilters')}</span><button className="cs-btn" type="button" onClick={resetFilters}>{pageText('billing.rechargeHistory.clearFilters2')}</button></div> : (
            <>
              <div className="rc-txhead" aria-hidden="true"><span>Date</span><span>Amount</span><span>Status</span><span>Actions</span></div>
              <div className="recharge-history__list">{filteredItems.map((item) => item.source === 'topup_order'
                ? <TopupHistoryCard key={item.key} presentation={item} />
                : <CryptoDepositActivityCard key={item.key} presentation={item} />)}</div>
            </>
          )}
        </>
      ) : null}
        </div>
      </div>
    </section>
  )
}
