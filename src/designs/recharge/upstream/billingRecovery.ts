import type { BillingOrderStatus } from './billingTypes'
import { billingOrderActivated, billingOrderPollingDecision } from './hooks/billing/billingPollingPolicy'

export type BillingOrderRecovery = Readonly<{
  title: string
  detail: string
  tone: 'progress' | 'success' | 'warning'
  canStartNewAttempt: boolean
}>

export function billingOrderRecovery(status: BillingOrderStatus | null): BillingOrderRecovery {
  if (billingOrderActivated(status)) return Object.freeze({
    title: 'Pro access activated',
    detail: 'The server verified both the payment and the Pro entitlement.',
    tone: 'success',
    canStartNewAttempt: false,
  })
  if (status === null) return Object.freeze({
    title: 'Verifying payment',
    detail: 'Waiting for the first owner-only status check. Do not repeat a payment while the result is unknown.',
    tone: 'progress',
    canStartNewAttempt: false,
  })
  if (status.status === 'underpaid' || status.status === 'overpaid') return Object.freeze({
    title: 'Payment amount mismatch',
    detail: 'Do not send a top-up or a second payment. The existing payment is being checked for manual review.',
    tone: 'warning',
    canStartNewAttempt: false,
  })
  if (status.status === 'manual_review') return Object.freeze({
    title: 'Payment requires review',
    detail: 'Do not pay again. Keep the existing transaction or order reference and contact support if the status does not change.',
    tone: 'warning',
    canStartNewAttempt: false,
  })
  if (status.status === 'refunded') return Object.freeze({
    title: 'Payment refunded',
    detail: 'This order is closed and its Pro access is unavailable. Do not reuse this order for another payment.',
    tone: 'warning',
    canStartNewAttempt: false,
  })
  if (status.status === 'failed' || status.status === 'canceled' || status.status === 'expired') return Object.freeze({
    title: 'Payment not completed',
    detail: 'This payment attempt is closed. You may safely start a new payment with a new order.',
    tone: 'warning',
    canStartNewAttempt: true,
  })
  if (status.status === 'paid' && billingOrderPollingDecision(status) === 'terminal') return Object.freeze({
    title: 'Payment confirmed, Pro access unavailable',
    detail: 'Do not pay again. Refresh once, then contact support with the order reference so the entitlement can be reviewed.',
    tone: 'warning',
    canStartNewAttempt: false,
  })
  return Object.freeze({
    title: 'Verifying payment',
    detail: 'The server is still verifying payment and entitlement evidence. Do not repeat the payment.',
    tone: 'progress',
    canStartNewAttempt: false,
  })
}
