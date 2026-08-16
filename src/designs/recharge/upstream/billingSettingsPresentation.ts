import type {
  BillingAccount,
  BillingAccountEntitlement,
  BillingAccountSubscription,
  BillingEntitlementSource,
  BillingPlan,
} from './billingTypes'

export type BillingSettingsUpcomingView = Readonly<{
  plan: BillingPlan
  entitlement: BillingAccountEntitlement
  providerLabel: string
  renewalLabel: string
}>

export type BillingSettingsPresentation = Readonly<{
  kind: 'free' | 'pending' | 'active' | 'scheduled'
  plan: BillingPlan | null
  entitlement: BillingAccountEntitlement | null
  subscription: BillingAccountSubscription | null
  statusLabel: string
  statusDetail: string
  providerLabel: string
  renewalLabel: string
  renewalDetail: string
  periodLabel: string
  periodStart: string | null
  periodEnd: string | null
  nextDateLabel: string | null
  nextDate: string | null
  graceEndsAt: string | null
  purchaseActionLabel: string
  showPaymentManagement: boolean
  canManagePaymentMethod: boolean
  canCancel: boolean
  cancellationScheduled: boolean
  canPurchase: boolean
  upcoming: BillingSettingsUpcomingView | null
}>

function providerLabel(source: BillingEntitlementSource | BillingAccountSubscription) {
  if ('kind' in source && source.kind === 'admin_adjustment') return 'Administrative grant'
  return source.provider === 'tao' ? 'TAO · Bittensor Mainnet' : 'Stripe'
}

function renewalPresentation(source: BillingEntitlementSource, subscription: BillingAccountSubscription | null) {
  if (source.kind === 'stripe_subscription') {
    if (subscription?.cancelAtPeriodEnd) return Object.freeze({
      label: 'Ends after current term',
      detail: 'Stripe will not renew this subscription after the paid access period.',
    })
    return Object.freeze({
      label: 'Automatic renewal',
      detail: 'Stripe renews this server-priced term automatically unless you cancel before the next billing date.',
    })
  }
  if (source.kind === 'stripe_one_time') return Object.freeze({
    label: 'One-time purchase', detail: 'This Stripe term does not renew automatically.',
  })
  if (source.kind === 'tao') return Object.freeze({
    label: 'Manual renewal', detail: 'TAO terms do not renew automatically. Purchase another term before access expires.',
  })
  return Object.freeze({
    label: 'No payment renewal', detail: 'This administrative Pro grant is not connected to an automatic payment.',
  })
}

function pendingStatus(subscription: BillingAccountSubscription) {
  switch (subscription.status) {
    case 'past_due': return ['Payment past due', 'Stripe is attempting payment recovery. Pro access is not confirmed by this account response.'] as const
    case 'paused': return ['Subscription paused', 'Stripe reports this subscription as paused. Pro access is not currently confirmed.'] as const
    case 'trialing': return ['Activation pending', 'The Stripe trial is visible, but Pro access is not confirmed yet.'] as const
    case 'active': return ['Access activation pending', 'Stripe is active, but the server has not attached a current Pro entitlement yet.'] as const
    default: return ['Payment pending', 'Complete payment and wait for the server to activate Pro access.'] as const
  }
}

export function billingSettingsPresentation(
  account: BillingAccount,
  plans: BillingPlan[],
): BillingSettingsPresentation | null {
  const entitlement = account.entitlement
  const subscription = account.subscription
  if (entitlement === null && subscription === null) {
    return Object.freeze({
      kind: 'free', plan: null, entitlement: null, subscription: null,
      statusLabel: 'Free plan',
      statusDetail: 'No active or scheduled Pro entitlement is attached to this account.',
      providerLabel: 'Not applicable', renewalLabel: 'No renewal',
      renewalDetail: 'Upgrade whenever you are ready. Existing token balance and instance limits remain independent.',
      periodLabel: 'Access period', periodStart: null, periodEnd: null, nextDateLabel: null, nextDate: null,
      graceEndsAt: null, purchaseActionLabel: 'Compare Pro plans', showPaymentManagement: false,
      canManagePaymentMethod: false, canCancel: false, cancellationScheduled: false,
      canPurchase: account.actions.canPurchase, upcoming: null,
    })
  }

  const planID = entitlement?.planId ?? subscription?.planId
  const plan = plans.find((candidate) => candidate.id === planID)
  if (!plan) return null

  if (entitlement === null && subscription) {
    const [statusLabel, statusDetail] = pendingStatus(subscription)
    const automatic = subscription.renewalMode === 'automatic'
    const graceEndsAt = subscription.paymentGraceEndsAt ?? null
    return Object.freeze({
      kind: 'pending', plan, entitlement: null, subscription, statusLabel, statusDetail,
      providerLabel: providerLabel(subscription),
      renewalLabel: automatic ? subscription.cancelAtPeriodEnd ? 'Ends after current term' : 'Automatic renewal' : 'Manual renewal',
      renewalDetail: automatic
        ? 'Subscription billing is managed by Stripe, but Pro access is not active until the server grants an entitlement.'
        : 'This term requires a manual payment before Pro access can be activated.',
      periodLabel: 'Expected subscription period', periodStart: subscription.currentPeriodStart, periodEnd: subscription.currentPeriodEnd,
      nextDateLabel: graceEndsAt ? 'Payment recovery deadline' : automatic ? 'Expected billing date' : 'Expected term end',
      nextDate: graceEndsAt ?? subscription.currentPeriodEnd, graceEndsAt,
      purchaseActionLabel: 'View plans', showPaymentManagement: subscription.provider === 'stripe',
      canManagePaymentMethod: account.actions.canManagePaymentMethod, canCancel: account.actions.canCancel,
      cancellationScheduled: subscription.cancelAtPeriodEnd, canPurchase: account.actions.canPurchase, upcoming: null,
    })
  }

  if (!entitlement) return null
  const source = entitlement.source
  const renewal = renewalPresentation(source, subscription)
  const automatic = source.kind === 'stripe_subscription'
  const graceEndsAt = subscription?.paymentGraceEndsAt ?? null
  const nextDateLabel = graceEndsAt
    ? 'Payment recovery deadline'
    : automatic && !subscription?.cancelAtPeriodEnd ? 'Next billing date' : 'Access expires'
  const upcomingEntitlement = account.upcomingEntitlement
  let upcoming: BillingSettingsUpcomingView | null = null
  if (upcomingEntitlement) {
    const upcomingPlan = plans.find((candidate) => candidate.id === upcomingEntitlement.planId)
    if (!upcomingPlan) return null
    upcoming = Object.freeze({
      plan: upcomingPlan,
      entitlement: upcomingEntitlement,
      providerLabel: providerLabel(upcomingEntitlement.source),
      renewalLabel: renewalPresentation(upcomingEntitlement.source, null).label,
    })
  }
  const active = entitlement.status === 'active'
  return Object.freeze({
    kind: active ? 'active' : 'scheduled', plan, entitlement, subscription,
    statusLabel: active ? subscription?.status === 'past_due' ? 'Pro active · payment past due' : 'Pro active' : 'Pro scheduled',
    statusDetail: active
      ? graceEndsAt ? 'Pro remains available during the one-hour payment recovery window.' : 'The server confirms that Pro access is active.'
      : 'This paid Pro term is scheduled to begin at the displayed start date.',
    providerLabel: providerLabel(source), renewalLabel: renewal.label, renewalDetail: renewal.detail,
    periodLabel: active ? 'Current access period' : 'Scheduled access period',
    periodStart: entitlement.startsAt, periodEnd: entitlement.expiresAt,
    nextDateLabel, nextDate: graceEndsAt ?? entitlement.expiresAt, graceEndsAt,
    purchaseActionLabel: source.kind === 'tao' ? 'Renew Pro' : source.kind === 'stripe_one_time' ? 'Buy another term' : 'Change plan',
    showPaymentManagement: source.kind === 'stripe_subscription',
    canManagePaymentMethod: account.actions.canManagePaymentMethod,
    canCancel: account.actions.canCancel,
    cancellationScheduled: Boolean(subscription?.cancelAtPeriodEnd),
    canPurchase: account.actions.canPurchase,
    upcoming,
  })
}
