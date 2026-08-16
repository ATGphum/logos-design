import type { BillingSubscriptionStatus } from './billingTypes'

export type BillingCancellationResult = Readonly<{
  subscriptionId: string
  status: Extract<BillingSubscriptionStatus, 'active' | 'past_due'>
  cancelAtPeriodEnd: true
  currentPeriodEnd: string
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseBillingCancellationResult(value: unknown): BillingCancellationResult | null {
  if (!isRecord(value) || Object.keys(value).sort().join(',') !==
      'cancelAtPeriodEnd,currentPeriodEnd,status,subscriptionId' ||
      typeof value.subscriptionId !== 'string' || !/^bsub_[A-Za-z0-9_-]+$/.test(value.subscriptionId) ||
      !['active', 'past_due'].includes(String(value.status)) || value.cancelAtPeriodEnd !== true ||
      typeof value.currentPeriodEnd !== 'string' || value.currentPeriodEnd.length > 64 ||
      !/^\d{4}-\d{2}-\d{2}T/.test(value.currentPeriodEnd) || !Number.isFinite(Date.parse(value.currentPeriodEnd))) return null
  return Object.freeze({
    subscriptionId: value.subscriptionId,
    status: value.status as BillingCancellationResult['status'],
    cancelAtPeriodEnd: true,
    currentPeriodEnd: value.currentPeriodEnd,
  })
}
