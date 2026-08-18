import { ExternalLink } from 'lucide-react'
import { formatBillingCreditUSD } from '../../billingTypes'
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

function statusNote(item: CryptoDepositActivityItem) {
  switch (item.status) {
    case 'detected':
      return pageText('billing.rechargeHistory.depositDetectedNote')
    case 'pending_price':
      return pageText('billing.rechargeHistory.depositPendingPriceNote')
    case 'below_minimum':
      if (item.minimumAtomic === null || item.assetDecimals === null || item.assetSymbol === null) return null
      return pageText('billing.rechargeHistory.depositBelowMinimumNote', {
        minimum: formatAtomicAssetAmount(item.minimumAtomic, item.assetDecimals),
        symbol: item.assetSymbol,
      })
    case 'manual_review':
      return pageText('billing.rechargeHistory.depositManualReviewNote')
    case 'credited':
      return item.creditedMicros === null ? null : pageText('billing.rechargeHistory.depositCreditedNote', {
        amount: formatBillingCreditUSD(item.creditedMicros),
      })
    case 'refunded':
      return item.creditedMicros === null ? null : pageText('billing.rechargeHistory.depositRefundedNote', {
        amount: formatBillingCreditUSD(item.creditedMicros),
      })
  }
}

function ledger(item: CryptoDepositActivityItem) {
  if (item.status === 'refunded') return item.refundEntryId
  return item.ledgerEntryId
}

export function CryptoDepositActivityCard({ presentation }: {
  presentation: CryptoDepositHistoryPresentationItem
}) {
  const { eventAt, item } = presentation
  const note = statusNote(item)
  const ledgerID = ledger(item)
  const knownAsset = item.assetSymbol !== null && item.assetDecimals !== null
  const assetLabel = item.assetSymbol ?? pageText('billing.rechargeHistory.unsupportedAsset')
  const amountLabel = knownAsset
    ? `${formatAtomicAssetAmount(item.atomicAmount, item.assetDecimals)} ${item.assetSymbol}`
    : pageText('billing.rechargeHistory.atomicUnits', { amount: item.atomicAmount })
  const explorerLabel = knownAsset
    ? pageText('billing.rechargeHistory.viewCryptoTransaction', {
      network: item.networkName,
      asset: item.assetSymbol,
    })
    : pageText('billing.rechargeHistory.viewCryptoTransactionWithoutAsset', {
      network: item.networkName,
    })
  return (
    <article
      data-history-source={presentation.source}
      data-history-id={presentation.sourceID}
      data-deposit-status={item.status}
    >
      <header>
        <div>
          <strong>{amountLabel}</strong>
          <small>{item.depositId}</small>
        </div>
        <span className={`billing-state billing-state--${item.status}`}>{statusLabel(item)}</span>
      </header>
      <dl>
        <div><dt>{pageText('billing.rechargeHistory.network')}</dt><dd>{item.networkName}</dd></div>
        <div><dt>{pageText('billing.rechargeHistory.asset')}</dt><dd>{assetLabel}</dd></div>
        <div><dt>{pageText('billing.rechargeHistory.event')}</dt><dd><time dateTime={eventAt}>{formatDateTime(eventAt)}</time></dd></div>
        <div><dt>{pageText('billing.rechargeHistory.ledger')}</dt><dd>{ledgerID === null ? pageText('billing.rechargeHistory.pending') : <code>{ledgerID}</code>}</dd></div>
      </dl>
      {item.status === 'refunded' && item.ledgerEntryId !== null ? (
        <p className="billing-inline-note">
          {note} {pageText('billing.rechargeHistory.originalCreditLedger')} <code>{item.ledgerEntryId}</code>
        </p>
      ) : note === null ? null : <p className="billing-inline-note">{note}</p>}
      <a href={item.transactionUrl} target="_blank" rel="noopener noreferrer" aria-label={explorerLabel}>
        {explorerLabel}<ExternalLink size={13} aria-hidden="true" />
      </a>
    </article>
  )
}
