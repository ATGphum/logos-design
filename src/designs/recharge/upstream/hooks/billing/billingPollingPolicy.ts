import type { BillingOrderStatus } from '../../billingTypes'

export const billingPollingDefaults = Object.freeze({
  pendingIntervalMs: 3_000,
  retryIntervalMs: 6_000,
  maxDurationMs: 30 * 60 * 1_000,
})

export type BillingPollingDecision = 'continue' | 'success' | 'terminal'

const terminalOrderStatuses = new Set<BillingOrderStatus['status']>([
  'failed',
  'canceled',
  'refunded',
  'expired',
  'manual_review',
])

const terminalEntitlementStatuses = new Set<BillingOrderStatus['entitlementStatus']>([
  'inactive',
  'expired',
  'revoked',
])

export function billingOrderActivated(status: BillingOrderStatus | null): boolean {
  return status?.status === 'paid' && (status.entitlementStatus === 'active' || status.entitlementStatus === 'scheduled') &&
    status.entitlement?.orderId === status.id && status.entitlement.planId === status.planId &&
    status.entitlement.status === status.entitlementStatus
}

export function billingOrderPollingDecision(status: BillingOrderStatus): BillingPollingDecision {
  if (billingOrderActivated(status)) return 'success'
  if (terminalOrderStatuses.has(status.status)) return 'terminal'
  if (status.status === 'paid' && terminalEntitlementStatuses.has(status.entitlementStatus)) return 'terminal'
  return 'continue'
}
