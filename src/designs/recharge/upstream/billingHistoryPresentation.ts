import type { BillingHistory, BillingHistoryItem, BillingHistoryPayment, BillingPlan } from './billingTypes'

export type BillingHistoryPaymentView = Readonly<{
  payment: BillingHistoryPayment
  kindLabel: string
  statusLabel: string
  eventLabel: string
  eventAt: string
  canViewStripeReceipt: boolean
}>

export type BillingHistoryItemView = Readonly<{
  item: BillingHistoryItem
  plan: BillingPlan
  providerLabel: string
  renewalLabel: string
  statusLabel: string
  dateLabel: string
  date: string
  refundLabel: string
  payments: readonly BillingHistoryPaymentView[]
}>

const orderStatusLabels: Readonly<Record<BillingHistoryItem['status'], string>> = Object.freeze({
  created: 'Created',
  pending_payment: 'Payment pending',
  submitted: 'Submitted',
  confirming: 'Confirming',
  paid: 'Paid',
  failed: 'Failed',
  expired: 'Expired',
  underpaid: 'Underpaid',
  overpaid: 'Overpaid',
  manual_review: 'Manual review',
  refunded: 'Refunded',
  canceled: 'Canceled',
})

export function billingHistoryPresentation(history: BillingHistory, plans: readonly BillingPlan[]): readonly BillingHistoryItemView[] | null {
  const planByID = new Map(plans.map((plan) => [plan.id, plan]))
  const result: BillingHistoryItemView[] = []
  for (const item of history.items) {
    const plan = planByID.get(item.planId)
    if (!plan) return null
    const dateLabel = item.refundedAt ? 'Refunded' : item.paidAt ? 'Paid' : 'Created'
    const date = item.refundedAt ?? item.paidAt ?? item.createdAt
    const payments = item.payments.map((payment): BillingHistoryPaymentView => {
      const eventLabel = payment.finalizedAt ? 'Finalized' : payment.paidAt ? 'Paid' : 'Recorded'
      return Object.freeze({
        payment,
        kindLabel: payment.kind === 'stripe_invoice' ? 'Stripe invoice' : payment.kind === 'stripe_payment' ? 'Stripe payment' : 'TAO transaction',
        statusLabel: humanize(payment.status),
        eventLabel,
        eventAt: payment.finalizedAt ?? payment.paidAt ?? payment.recordedAt,
        canViewStripeReceipt: payment.kind === 'stripe_invoice' && history.actions.canViewStripeReceipts,
      })
    })
    result.push(Object.freeze({
      item,
      plan,
      providerLabel: item.provider === 'stripe' ? 'Stripe' : 'Native TAO',
      renewalLabel: item.renewalMode === 'automatic'
        ? item.orderType === 'renewal' ? 'Automatic renewal' : 'Automatic subscription'
        : item.renewalMode === 'manual' ? 'Manual renewal' : 'One-time purchase',
      statusLabel: orderStatusLabels[item.status],
      dateLabel,
      date,
      refundLabel: item.refundStatus === 'refunded' ? 'Fully refunded' : 'Not refunded',
      payments: Object.freeze(payments),
    }))
  }
  return Object.freeze(result)
}

function humanize(value: string) {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
