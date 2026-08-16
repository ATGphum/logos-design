import type { BillingOrderStatus, BillingPlan } from './billingTypes'
import { billingOrderActivated } from './hooks/billing/billingPollingPolicy'
import { pageText } from './i18n/pageText'

export type BillingSuccessPresentation = Readonly<{
  headline: string
  summary: string
  accessLabel: string
  providerLabel: 'Stripe' | 'TAO · Bittensor Mainnet'
  renewalLabel: string
  renewalDetail: string
  periodLabel: string
  startsAt: string
  expiresAt: string
  nextDateLabel: string
  nextDate: string
}>

export function billingSuccessPresentation(
  status: BillingOrderStatus,
  plan: BillingPlan,
): BillingSuccessPresentation | null {
  if (!billingOrderActivated(status) || status.planId !== plan.id || !status.entitlement) return null
  const entitlement = status.entitlement
  if (entitlement.orderId !== status.id || entitlement.planId !== plan.id || entitlement.status !== status.entitlementStatus ||
      Date.parse(entitlement.expiresAt) <= Date.parse(entitlement.startsAt)) return null

  const scheduled = entitlement.status === 'scheduled'
  const base = {
    headline: scheduled ? pageText('billing.billingSuccess.nextTermScheduled') : pageText('billing.billingSuccess.proAccessActive'),
    accessLabel: scheduled ? pageText('billing.billingSuccess.scheduled') : pageText('billing.billingSuccess.active'),
    periodLabel: scheduled ? pageText('billing.billingSuccess.scheduledAccessPeriod') : pageText('billing.billingSuccess.currentAccessPeriod'),
    startsAt: entitlement.startsAt,
    expiresAt: entitlement.expiresAt,
  }

  if (status.provider === 'tao') {
    if (status.subscription !== undefined || status.subscriptionId !== undefined) return null
    return Object.freeze({
      ...base,
      summary: scheduled
        ? pageText('billing.billingSuccess.bittensorScheduledSummary', { plan: plan.name })
        : pageText('billing.billingSuccess.bittensorActiveSummary', { plan: plan.name }),
      providerLabel: 'TAO · Bittensor Mainnet',
      renewalLabel: pageText('billing.billingSuccess.manualRenewal'),
      renewalDetail: pageText('billing.billingSuccess.taoManualRenewalDetail'),
      nextDateLabel: pageText('billing.billingSuccess.accessExpires'),
      nextDate: entitlement.expiresAt,
    })
  }

  if (plan.billingMode === 'recurring') {
    const subscription = status.subscription
    if (!subscription || subscription.id !== status.subscriptionId || subscription.initialOrderId !== status.id ||
        subscription.planId !== plan.id || subscription.provider !== 'stripe' || subscription.renewalMode !== 'automatic' ||
        !['trialing', 'active'].includes(subscription.status) ||
        Date.parse(subscription.currentPeriodStart) !== Date.parse(entitlement.startsAt) ||
        Date.parse(subscription.currentPeriodEnd) !== Date.parse(entitlement.expiresAt)) return null
    return Object.freeze({
      ...base,
      summary: scheduled
        ? pageText('billing.billingSuccess.stripeScheduledSummary', { plan: plan.name })
        : pageText('billing.billingSuccess.stripeActiveSummary', { plan: plan.name }),
      providerLabel: 'Stripe',
      renewalLabel: subscription.cancelAtPeriodEnd ? pageText('billing.billingSuccess.endsAfterCurrentTerm') : pageText('billing.billingSuccess.automaticRenewal'),
      renewalDetail: subscription.cancelAtPeriodEnd
        ? pageText('billing.billingSuccess.stripeWillNotRenew')
        : pageText('billing.billingSuccess.stripeAutomaticRenewalDetail'),
      nextDateLabel: subscription.cancelAtPeriodEnd ? pageText('billing.billingSuccess.accessExpires') : pageText('billing.billingSuccess.nextBillingDate'),
      nextDate: subscription.currentPeriodEnd,
    })
  }

  if (status.subscription !== undefined || status.subscriptionId !== undefined) return null
  return Object.freeze({
    ...base,
    summary: scheduled
      ? pageText('billing.billingSuccess.stripeScheduledSummary', { plan: plan.name })
      : pageText('billing.billingSuccess.stripeActiveSummary', { plan: plan.name }),
    providerLabel: 'Stripe',
    renewalLabel: pageText('billing.billingSuccess.oneTimePurchase'),
    renewalDetail: pageText('billing.billingSuccess.oneTimePurchaseDetail'),
    nextDateLabel: pageText('billing.billingSuccess.accessExpires'),
    nextDate: entitlement.expiresAt,
  })
}
