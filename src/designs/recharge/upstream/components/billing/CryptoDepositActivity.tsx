import { formatBillingPaidUSD } from '../../billingTypes'
import {
  formatAtomicAssetAmount,
  type CryptoDepositActivityItem,
} from '../../depositTypes'
import { pageText } from '../../i18n/pageText'
import { formatDateTime } from '../../utils/format'
import type { CryptoDepositHistoryPresentationItem } from './rechargeHistoryPresentation'

function statusLabel(item: CryptoDepositActivityItem) {
  switch (item.status) {
    case 'detected': return pageText('billing.rechargeHistory.detected')
    case 'pending_price': return pageText('billing.rechargeHistory.pendingPrice')
    case 'credited': return pageText('billing.rechargeHistory.credited')
    case 'below_minimum': return pageText('billing.rechargeHistory.belowMinimum')
    case 'manual_review': return pageText('billing.rechargeHistory.manualReview')
    case 'refunded': return pageText('billing.rechargeHistory.refunded')
  }
}

export function CryptoDepositActivityCard({ presentation }: {
  presentation: CryptoDepositHistoryPresentationItem
}) {
  const { eventAt, item } = presentation
  const knownAsset = item.assetSymbol !== null && item.assetDecimals !== null
  const amountLabel = knownAsset
    ? `${formatAtomicAssetAmount(item.atomicAmount, item.assetDecimals)} ${item.assetSymbol}`
    : pageText('billing.rechargeHistory.atomicUnits', { amount: item.atomicAmount })
  const creditedLabel = item.creditedMicros === null
    ? amountLabel
    : `${formatBillingPaidUSD(item.creditedMicros)} ${pageText('billing.rechargeHistory.credit')}`
  const explorerLabel = knownAsset
    ? pageText('billing.rechargeHistory.viewCryptoTransaction', {
      network: item.networkName,
      asset: item.assetSymbol,
    })
    : pageText('billing.rechargeHistory.viewCryptoTransactionWithoutAsset', {
      network: item.networkName,
    })
  /* DESIGN HANDOFF: one table row per deposit — date / amount / status / link.
     Upstream renders a card with a labelled 4-column <dl>, a note line and a full-text
     explorer link (~5 lines each). Network, asset, ledger id and the note are dropped
     here; the status pill already carries the outcome. */
  return (
    <div
      className="rc-txrow"
      data-history-source={presentation.source}
      data-history-id={presentation.sourceID}
      data-deposit-status={item.status}
    >
      <time className="rc-txrow__date" dateTime={eventAt}>{formatDateTime(eventAt)}</time>
      <span className="rc-txrow__amount">{creditedLabel}</span>
      <span className={`rc-txrow__status billing-state billing-state--${item.status}`}>{statusLabel(item)}</span>
      <a className="rc-txrow__action" href={item.transactionUrl} target="_blank" rel="noopener noreferrer" aria-label={explorerLabel}>
        View
      </a>
    </div>
  )
}
