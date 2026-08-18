import type { CryptoDepositActivity, CryptoDepositActivityItem } from '../../depositTypes'

export type CryptoDepositHistoryStatusFilter = 'credited' | 'refunded' | 'in_progress' | 'not_credited'

export type CryptoDepositHistoryPresentationItem = Readonly<{
  key: `deposit:${string}`
  source: 'crypto_deposit'
  sourceID: string
  method: 'crypto'
  statusFilter: CryptoDepositHistoryStatusFilter
  eventAt: string
  item: CryptoDepositActivityItem
}>

function depositEventAt(item: CryptoDepositActivityItem) {
  return item.refundedAt ?? item.creditedAt ?? item.detectedAt
}

function depositStatusFilter(item: CryptoDepositActivityItem): CryptoDepositHistoryStatusFilter {
  if (item.status === 'credited') return 'credited'
  if (item.status === 'refunded') return 'refunded'
  if (item.status === 'below_minimum' || item.status === 'manual_review') return 'not_credited'
  return 'in_progress'
}

export function cryptoDepositHistoryPresentation(activity: CryptoDepositActivity) {
  const deposits = new Map<string, CryptoDepositHistoryPresentationItem>()
  for (const item of activity.items) {
    if (deposits.has(item.depositId)) continue
    deposits.set(item.depositId, Object.freeze({
      key: `deposit:${item.depositId}`,
      source: 'crypto_deposit',
      sourceID: item.depositId,
      method: 'crypto',
      statusFilter: depositStatusFilter(item),
      eventAt: depositEventAt(item),
      item,
    }))
  }
  return [...deposits.values()]
}
