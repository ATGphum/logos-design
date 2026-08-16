import { formatCurrencyMicrosExact } from './utils/format'

export const billingCheckoutPlanIDs = ['pro_7d', 'pro_quarterly', 'pro_6_months'] as const

export type BillingCheckoutPlanID = (typeof billingCheckoutPlanIDs)[number]

export type BillingPaymentMethod = 'stripe' | 'tao'

export type BillingPlan = Readonly<{
  id: BillingCheckoutPlanID
  code: BillingCheckoutPlanID
  name: string
  productCode: 'pro'
  billingMode: 'one_time' | 'recurring'
  duration: Readonly<{ unit: 'day' | 'month'; count: number }>
  price: Readonly<{ currency: 'USD'; total: string; displayMonthly: string | null }>
  discountLabel?: string
  paymentMethods: Readonly<Record<BillingPaymentMethod, boolean>>
  policyRevision: number
  entitlementPolicy: Readonly<{
    proAccess: true
    includedActiveInstances: number
    cpuCoresPerInstance: number
    memoryBytesPerInstance: number
    workspaceBytesPerInstance: number
  }>
}>

export type BillingPublicConfig = Readonly<{
  stripe: Readonly<{
    enabled: boolean
    publishableKey: string
    liveMode: boolean
    paymentElementEnabled: boolean
    expressCheckoutEnabled: boolean
    customerPortalEnabled: boolean
  }>
  tao: Readonly<{
    enabled: boolean
    walletTransferEnabled: boolean
    browserPublicWssUrl: string
  }>
}>

export type BillingEntitlementSource = Readonly<{
  kind: 'stripe_subscription' | 'stripe_one_time' | 'tao' | 'admin_adjustment'
  provider: BillingPaymentMethod | null
  renewalMode: 'automatic' | 'manual' | 'one_time' | 'none'
  orderId?: string
  subscriptionId?: string
}>

export type BillingAccountEntitlement = Readonly<{
  id: string
  planId: BillingCheckoutPlanID
  status: 'active' | 'scheduled'
  startsAt: string
  expiresAt: string
  policy: BillingPlan['entitlementPolicy']
  source: BillingEntitlementSource
}>

export type BillingAccountSubscription = Readonly<{
  id: string
  planId: BillingCheckoutPlanID
  provider: BillingPaymentMethod
  renewalMode: 'automatic' | 'manual'
  status: BillingSubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  paymentGraceEndsAt?: string
}>

export type BillingAccount = Readonly<{
  customerExists: boolean
  subscription: BillingAccountSubscription | null
  entitlement: BillingAccountEntitlement | null
  upcomingEntitlement: BillingAccountEntitlement | null
  actions: Readonly<{
    canCancel: boolean
    canManagePaymentMethod: boolean
    canPurchase: boolean
  }>
}>

export type BillingRechargeAccount = Readonly<{
  customerExists: boolean
  balanceMicros: string
  ledgerConfigured: boolean
  topup: Readonly<{
    allowed: boolean
    canCreateCheckout: boolean
    activeOrderId: string | null
  }>
}>

export type BillingTopupProduct = Readonly<{
  id: string
  code: string
  name: string
  currency: 'USD'
  paidMicros: string
  creditedMicros: string
  displayAmount: string
  revision: number
  customAmount: Readonly<{
    enabled: boolean
    minMicros: string
    maxMicros: string
  }>
  paymentMethods: Readonly<Record<BillingPaymentMethod, boolean>>
}>

export function billingTopupProductIDValid(value: unknown): value is string {
  return typeof value === 'string' && /^topup_[A-Za-z0-9_-]{1,120}$/.test(value)
}

export type BillingRechargeProfileView = Readonly<{
  kind: 'loading' | 'unavailable' | 'ready' | 'restricted' | 'pending'
  balanceLabel: string
  statusLabel: string
  actionLabel: 'Recharge'
}>

export function billingCreditMicrosValid(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(?:0|-?[1-9][0-9]{0,18})$/.test(value)) return false
  const micros = BigInt(value)
  return micros >= -9_223_372_036_854_775_808n && micros <= 9_223_372_036_854_775_807n
}

export function formatBillingCreditUSD(value: string): string {
  return formatCurrencyMicrosExact(value, 'USD')
}

export function parseBillingRechargeAccount(value: unknown): BillingRechargeAccount | null {
  if (!isRecord(value) || typeof value.customerExists !== 'boolean' ||
      !billingCreditMicrosValid(value.balanceMicros) || typeof value.ledgerConfigured !== 'boolean' ||
      !isRecord(value.topup) || typeof value.topup.allowed !== 'boolean' ||
      typeof value.topup.canCreateCheckout !== 'boolean' ||
      !(value.topup.activeOrderId === null || billingID(value.topup.activeOrderId, 'bord'))) return null
  const activeOrderId = value.topup.activeOrderId as string | null
  if (!value.ledgerConfigured && (value.balanceMicros !== '0' || value.topup.allowed ||
      value.topup.canCreateCheckout || activeOrderId !== null)) return null
  if (!value.topup.allowed && value.topup.canCreateCheckout) return null
  if (value.topup.canCreateCheckout && activeOrderId !== null) return null
  if (!value.customerExists && activeOrderId !== null) return null
  return Object.freeze({
    customerExists: value.customerExists,
    balanceMicros: value.balanceMicros,
    ledgerConfigured: value.ledgerConfigured,
    topup: Object.freeze({
      allowed: value.topup.allowed,
      canCreateCheckout: value.topup.canCreateCheckout,
      activeOrderId,
    }),
  })
}

export function parseBillingTopupProducts(value: unknown): readonly BillingTopupProduct[] | null {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Array.isArray(value.items) || value.items.length === 0 || value.items.length > 100) return null
  const items: BillingTopupProduct[] = []
  const ids = new Set<string>()
  const codes = new Set<string>()
  const productKeys = new Set(['id', 'code', 'name', 'currency', 'paidMicros', 'creditedMicros', 'displayAmount', 'revision', 'customAmount', 'paymentMethods'])
  for (const candidate of value.items) {
    if (!isRecord(candidate) || Object.keys(candidate).length !== productKeys.size || Object.keys(candidate).some((key) => !productKeys.has(key)) ||
        !billingTopupProductIDValid(candidate.id) || !billingID(candidate.code, 'topup') ||
        !safeText(candidate.name, 120) || candidate.currency !== 'USD' ||
        !billingCreditMicrosValid(candidate.paidMicros) || BigInt(candidate.paidMicros) <= 0n ||
        !billingCreditMicrosValid(candidate.creditedMicros) || BigInt(candidate.creditedMicros) <= 0n ||
        typeof candidate.displayAmount !== 'string' || !/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(candidate.displayAmount) ||
        !Number.isSafeInteger(candidate.revision) || Number(candidate.revision) < 1 ||
        !isRecord(candidate.customAmount) || Object.keys(candidate.customAmount).length !== 3 ||
        typeof candidate.customAmount.enabled !== 'boolean' ||
        !billingCreditMicrosValid(candidate.customAmount.minMicros) || BigInt(candidate.customAmount.minMicros) <= 0n ||
        !billingCreditMicrosValid(candidate.customAmount.maxMicros) ||
        BigInt(candidate.customAmount.maxMicros) < BigInt(candidate.customAmount.minMicros) ||
        !isRecord(candidate.paymentMethods) || Object.keys(candidate.paymentMethods).length !== 2 ||
        typeof candidate.paymentMethods.tao !== 'boolean' ||
        typeof candidate.paymentMethods.stripe !== 'boolean' || ids.has(candidate.id as string) || codes.has(candidate.code as string)) return null
    const [whole, cents] = candidate.displayAmount.split('.')
    const displayMicros = BigInt(whole) * 1_000_000n + BigInt(cents) * 10_000n
    if (displayMicros !== BigInt(candidate.paidMicros) || BigInt(candidate.customAmount.minMicros) % 10_000n !== 0n ||
        BigInt(candidate.customAmount.maxMicros) % 10_000n !== 0n ||
        (candidate.customAmount.enabled
          ? BigInt(candidate.paidMicros) !== BigInt(candidate.customAmount.minMicros)
          : candidate.customAmount.minMicros !== candidate.paidMicros || candidate.customAmount.maxMicros !== candidate.paidMicros)) return null
    ids.add(candidate.id as string)
    codes.add(candidate.code as string)
    items.push(Object.freeze({
      id: candidate.id as string,
      code: candidate.code as string,
      name: candidate.name as string,
      currency: 'USD',
      paidMicros: candidate.paidMicros,
      creditedMicros: candidate.creditedMicros,
      displayAmount: candidate.displayAmount,
      revision: Number(candidate.revision),
      customAmount: Object.freeze({
        enabled: candidate.customAmount.enabled,
        minMicros: candidate.customAmount.minMicros,
        maxMicros: candidate.customAmount.maxMicros,
      }),
      paymentMethods: Object.freeze({ tao: candidate.paymentMethods.tao, stripe: candidate.paymentMethods.stripe }),
    }))
  }
  return Object.freeze(items)
}

export function billingRechargeProfileView(
  account: BillingRechargeAccount | null,
  available: boolean,
  loading = false,
): BillingRechargeProfileView {
  if (loading && account === null) return Object.freeze({ kind: 'loading', balanceLabel: 'Checking…', statusLabel: 'Checking…', actionLabel: 'Recharge' })
  if (!available || account === null) return Object.freeze({ kind: 'unavailable', balanceLabel: 'Unavailable', statusLabel: 'Unavailable', actionLabel: 'Recharge' })
  const balanceLabel = formatBillingCreditUSD(account.balanceMicros)
  if (account.topup.activeOrderId !== null) return Object.freeze({ kind: 'pending', balanceLabel, statusLabel: 'Payment pending', actionLabel: 'Recharge' })
  if (!account.ledgerConfigured || !account.topup.allowed) return Object.freeze({ kind: 'restricted', balanceLabel, statusLabel: 'Recharge unavailable', actionLabel: 'Recharge' })
  return Object.freeze({ kind: 'ready', balanceLabel, statusLabel: 'Available', actionLabel: 'Recharge' })
}

export type BillingProfileView = Readonly<{
  kind: 'loading' | 'unavailable' | 'free' | 'scheduled' | 'active' | 'pending'
  statusLabel: string
  action: 'upgrade' | 'manage'
  actionLabel: string
}>

export function billingProfileView(account: BillingAccount | null, available: boolean): BillingProfileView {
  if (!available) return Object.freeze({ kind: 'unavailable', statusLabel: 'Unavailable', action: 'manage', actionLabel: 'Open Billing' })
  if (account === null) return Object.freeze({ kind: 'loading', statusLabel: 'Checking…', action: 'manage', actionLabel: 'Open Billing' })
  if (account.entitlement?.status === 'active') return Object.freeze({ kind: 'active', statusLabel: 'Pro active', action: 'manage', actionLabel: 'Manage billing' })
  if (account.entitlement?.status === 'scheduled') return Object.freeze({ kind: 'scheduled', statusLabel: 'Pro scheduled', action: 'manage', actionLabel: 'Manage billing' })
  if (account.subscription !== null) return Object.freeze({ kind: 'pending', statusLabel: 'Activation pending', action: 'manage', actionLabel: 'Manage billing' })
  return Object.freeze({ kind: 'free', statusLabel: 'Free', action: 'upgrade', actionLabel: 'Upgrade to Pro' })
}

export type BillingHistoryPayment = Readonly<{
  paymentId: string
  kind: 'stripe_payment' | 'stripe_invoice' | 'tao_transaction'
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded' |
    'not_found' | 'submitted' | 'in_block' | 'finalized' | 'reverted' | 'duplicate' |
    'invalid_recipient' | 'invalid_amount' | 'invalid_sender' | 'expired_quote'
  recordedAt: string
  paidAt?: string
  finalizedAt?: string
  transactionHash?: string
  transactionURL?: string
}>

export type BillingHistoryItem = Readonly<{
  orderId: string
  orderNo: string
  planId: BillingCheckoutPlanID
  provider: BillingPaymentMethod
  orderType: 'one_time' | 'subscription_initial' | 'renewal'
  renewalMode: 'automatic' | 'manual' | 'one_time'
  amountUSD: string
  status: BillingOrderLifecycleStatus
  createdAt: string
  paidAt?: string
  refundStatus: 'not_refunded' | 'refunded'
  refundedAt?: string
  payments: readonly BillingHistoryPayment[]
}>

export type BillingHistory = Readonly<{
  items: readonly BillingHistoryItem[]
  actions: Readonly<{ canViewStripeReceipts: boolean }>
}>

export const billingOrderLifecycleStatuses = [
  'created', 'pending_payment', 'submitted', 'confirming', 'paid', 'failed', 'expired',
  'underpaid', 'overpaid', 'manual_review', 'refunded', 'canceled',
] as const

export const billingPaymentStatuses = [
  'waiting', 'pending', 'processing', 'not_found', 'submitted', 'in_block', 'finalizing', 'finalized',
  'confirmed', 'succeeded', 'failed', 'canceled', 'refunded', 'manual_review', 'expired',
  'underpaid', 'overpaid', 'reverted', 'duplicate', 'invalid_recipient', 'invalid_amount',
  'invalid_sender', 'expired_quote',
] as const

export const billingOrderEntitlementStatuses = [
  'pending', 'inactive', 'scheduled', 'active', 'expired', 'revoked',
] as const

export const billingSubscriptionStatuses = [
  'incomplete', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'expired', 'unpaid',
] as const

export type BillingOrderLifecycleStatus = (typeof billingOrderLifecycleStatuses)[number]
export type BillingPaymentStatus = (typeof billingPaymentStatuses)[number]
export type BillingOrderEntitlementStatus = (typeof billingOrderEntitlementStatuses)[number]
export type BillingSubscriptionStatus = (typeof billingSubscriptionStatuses)[number]

export type BillingOrderEntitlementOutcome = Readonly<{
  id: string
  orderId: string
  planId: BillingCheckoutPlanID
  status: Exclude<BillingOrderEntitlementStatus, 'pending' | 'inactive'>
  startsAt: string
  expiresAt: string
}>

export type BillingOrderSubscriptionOutcome = Readonly<{
  id: string
  initialOrderId: string
  planId: BillingCheckoutPlanID
  provider: BillingPaymentMethod
  renewalMode: 'automatic' | 'manual'
  status: BillingSubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}>

export type BillingOrderStatus = Readonly<{
  id: string
  orderNo: string
  planId: BillingCheckoutPlanID
  provider: BillingPaymentMethod
  status: BillingOrderLifecycleStatus
  paymentStatus: BillingPaymentStatus
  entitlementStatus: BillingOrderEntitlementStatus
  expiresAt?: string
  subscriptionId?: string
  entitlement?: BillingOrderEntitlementOutcome
  subscription?: BillingOrderSubscriptionOutcome
  failure: null | Readonly<{ code: string; message: string }>
}>

export const stripeCheckoutPlanIDs = billingCheckoutPlanIDs

export type StripeCheckoutPlanID = BillingCheckoutPlanID

export type BillingStripePublicConfig = {
  enabled: true
  publishableKey: string
  liveMode: boolean
  paymentElementEnabled: boolean
  expressCheckoutEnabled: boolean
}

export type BillingStripeCheckoutSession = {
  orderId: string
  subscriptionId?: string
  integrationMode: 'elements'
  providerSessionId: string
  clientSecret: string
  checkoutUrl: null
}

export type BillingStripePendingReference = Pick<BillingStripeCheckoutSession, 'orderId' | 'subscriptionId'>

export type BillingStripeReturnReference = Readonly<{ orderId: string }>

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function billingID(value: unknown, prefix: string) {
  return typeof value === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9_-]+$`).test(value)
}

function safeText(value: unknown, maximum = 160) {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= maximum
}

function decimalUSD(value: unknown): value is string {
  return typeof value === 'string' && /^(?:0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(value)
}

function isoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
}

function parseEntitlementPolicy(value: unknown): BillingPlan['entitlementPolicy'] | null {
  if (!isRecord(value) || value.proAccess !== true ||
      !Number.isSafeInteger(value.includedActiveInstances) || Number(value.includedActiveInstances) < 1 ||
      !Number.isSafeInteger(value.cpuCoresPerInstance) || Number(value.cpuCoresPerInstance) < 1 ||
      !Number.isSafeInteger(value.memoryBytesPerInstance) || Number(value.memoryBytesPerInstance) < 1 ||
      !Number.isSafeInteger(value.workspaceBytesPerInstance) || Number(value.workspaceBytesPerInstance) < 1) return null
  return Object.freeze({
    proAccess: true,
    includedActiveInstances: Number(value.includedActiveInstances),
    cpuCoresPerInstance: Number(value.cpuCoresPerInstance),
    memoryBytesPerInstance: Number(value.memoryBytesPerInstance),
    workspaceBytesPerInstance: Number(value.workspaceBytesPerInstance),
  })
}

export function parseBillingPlans(value: unknown): BillingPlan[] | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null
  const result: BillingPlan[] = []
  const seen = new Set<string>()
  for (const candidate of value.items) {
    if (!isRecord(candidate) || !billingCheckoutPlanIDValid(String(candidate.id || '')) ||
        candidate.code !== candidate.id || seen.has(String(candidate.id)) || !safeText(candidate.name) ||
        candidate.productCode !== 'pro' || !['one_time', 'recurring'].includes(String(candidate.billingMode)) ||
        !isRecord(candidate.duration) || !['day', 'month'].includes(String(candidate.duration.unit)) ||
        !Number.isSafeInteger(candidate.duration.count) || Number(candidate.duration.count) < 1 ||
        !isRecord(candidate.price) || candidate.price.currency !== 'USD' || !decimalUSD(candidate.price.total) ||
        !(candidate.price.displayMonthly === null || decimalUSD(candidate.price.displayMonthly)) ||
        !isRecord(candidate.paymentMethods) || typeof candidate.paymentMethods.stripe !== 'boolean' ||
        typeof candidate.paymentMethods.tao !== 'boolean' || !Number.isSafeInteger(candidate.policyRevision) ||
        Number(candidate.policyRevision) < 1) return null
    const policy = parseEntitlementPolicy(candidate.entitlementPolicy)
    if (policy === null) return null
    const discountLabel = typeof candidate.discountLabel === 'string' && safeText(candidate.discountLabel, 80)
      ? candidate.discountLabel
      : undefined
    const plan: BillingPlan = {
      id: candidate.id as BillingCheckoutPlanID,
      code: candidate.id as BillingCheckoutPlanID,
      name: candidate.name as string,
      productCode: 'pro',
      billingMode: candidate.billingMode as BillingPlan['billingMode'],
      duration: Object.freeze({ unit: candidate.duration.unit as 'day' | 'month', count: Number(candidate.duration.count) }),
      price: Object.freeze({
        currency: 'USD',
        total: candidate.price.total,
        displayMonthly: candidate.price.displayMonthly as string | null,
      }),
      paymentMethods: Object.freeze({ stripe: candidate.paymentMethods.stripe, tao: candidate.paymentMethods.tao }),
      policyRevision: Number(candidate.policyRevision),
      entitlementPolicy: policy,
      ...(discountLabel ? { discountLabel } : {}),
    }
    seen.add(plan.id)
    result.push(Object.freeze(plan))
  }
  return result.length > 0 ? result : null
}

export function parseBillingPublicConfig(value: unknown): BillingPublicConfig | null {
  if (!isRecord(value) || !isRecord(value.stripe) || typeof value.stripe.enabled !== 'boolean' ||
      typeof value.stripe.publishableKey !== 'string' || typeof value.stripe.liveMode !== 'boolean' ||
      typeof value.stripe.paymentElementEnabled !== 'boolean' || typeof value.stripe.expressCheckoutEnabled !== 'boolean' ||
      typeof value.stripe.customerPortalEnabled !== 'boolean' || !isRecord(value.tao) ||
      typeof value.tao.enabled !== 'boolean' || typeof value.tao.walletTransferEnabled !== 'boolean' ||
      typeof value.tao.browserPublicWssUrl !== 'string') return null
  const keyMode = publishableKeyMode(value.stripe.publishableKey)
  if (value.stripe.enabled && (!keyMode || (keyMode === 'live') !== value.stripe.liveMode ||
      !value.stripe.paymentElementEnabled && !value.stripe.expressCheckoutEnabled)) return null
  if (!value.stripe.enabled && (value.stripe.publishableKey !== '' || value.stripe.liveMode ||
      value.stripe.paymentElementEnabled || value.stripe.expressCheckoutEnabled)) return null
  if (value.tao.walletTransferEnabled && (!value.tao.enabled || !taoBrowserPublicWSSURL(value.tao.browserPublicWssUrl))) return null
  if (!value.tao.walletTransferEnabled && value.tao.browserPublicWssUrl !== '') return null
  return Object.freeze({ stripe: Object.freeze({
    enabled: value.stripe.enabled,
    publishableKey: value.stripe.publishableKey,
    liveMode: value.stripe.liveMode,
    paymentElementEnabled: value.stripe.paymentElementEnabled,
    expressCheckoutEnabled: value.stripe.expressCheckoutEnabled,
    customerPortalEnabled: value.stripe.customerPortalEnabled,
  }), tao: Object.freeze({
    enabled: value.tao.enabled,
    walletTransferEnabled: value.tao.walletTransferEnabled,
    browserPublicWssUrl: value.tao.browserPublicWssUrl,
  }) })
}

function taoBrowserPublicWSSURL(value: string) {
  if (value.length > 2048 || value.trim() !== value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'wss:' && parsed.username === '' && parsed.password === '' && parsed.port === '' &&
      parsed.search === '' && parsed.hash === '' && (parsed.pathname === '' || parsed.pathname === '/')
  } catch {
    return false
  }
}

function parseBillingEntitlementSource(value: unknown): BillingEntitlementSource | null {
  if (!isRecord(value) || !['stripe_subscription', 'stripe_one_time', 'tao', 'admin_adjustment'].includes(String(value.kind)) ||
      !['automatic', 'manual', 'one_time', 'none'].includes(String(value.renewalMode)) ||
      !(value.provider === null || ['stripe', 'tao'].includes(String(value.provider))) ||
      (value.orderId !== undefined && !billingID(value.orderId, 'bord')) ||
      (value.subscriptionId !== undefined && !billingID(value.subscriptionId, 'bsub'))) return null
  const exact = value.kind === 'stripe_subscription'
    ? value.provider === 'stripe' && value.renewalMode === 'automatic' && typeof value.orderId === 'string' && typeof value.subscriptionId === 'string'
    : value.kind === 'stripe_one_time'
      ? value.provider === 'stripe' && value.renewalMode === 'one_time' && typeof value.orderId === 'string' && value.subscriptionId === undefined
      : value.kind === 'tao'
        ? value.provider === 'tao' && value.renewalMode === 'manual' && typeof value.orderId === 'string' && value.subscriptionId === undefined
        : value.provider === null && value.renewalMode === 'none' && value.orderId === undefined && value.subscriptionId === undefined
  if (!exact) return null
  return Object.freeze({
    kind: value.kind as BillingEntitlementSource['kind'],
    provider: value.provider as BillingEntitlementSource['provider'],
    renewalMode: value.renewalMode as BillingEntitlementSource['renewalMode'],
    ...(typeof value.orderId === 'string' ? { orderId: value.orderId } : {}),
    ...(typeof value.subscriptionId === 'string' ? { subscriptionId: value.subscriptionId } : {}),
  })
}

function parseBillingAccountEntitlement(value: unknown): BillingAccountEntitlement | null {
  if (!isRecord(value) || !billingID(value.id, 'bent') || !billingCheckoutPlanIDValid(String(value.planId || '')) ||
      !['active', 'scheduled'].includes(String(value.status)) || !isoDate(value.startsAt) || !isoDate(value.expiresAt) ||
      Date.parse(value.expiresAt) <= Date.parse(value.startsAt)) return null
  const policy = parseEntitlementPolicy(value.policy)
  const source = parseBillingEntitlementSource(value.source)
  if (policy === null || source === null) return null
  return Object.freeze({
    id: value.id as string,
    planId: value.planId as BillingCheckoutPlanID,
    status: value.status as BillingAccountEntitlement['status'],
    startsAt: value.startsAt,
    expiresAt: value.expiresAt,
    policy,
    source,
  })
}

function parseBillingAccountSubscription(value: unknown): BillingAccountSubscription | null {
  if (!isRecord(value) || !billingID(value.id, 'bsub') || !billingCheckoutPlanIDValid(String(value.planId || '')) ||
      !['stripe', 'tao'].includes(String(value.provider)) || !['automatic', 'manual'].includes(String(value.renewalMode)) ||
      (value.provider === 'stripe' ? value.renewalMode !== 'automatic' : value.renewalMode !== 'manual') ||
      !billingSubscriptionStatuses.includes(value.status as BillingSubscriptionStatus) ||
      ['canceled', 'expired', 'unpaid'].includes(String(value.status)) ||
      !isoDate(value.currentPeriodStart) || !isoDate(value.currentPeriodEnd) ||
      Date.parse(value.currentPeriodEnd) <= Date.parse(value.currentPeriodStart) || typeof value.cancelAtPeriodEnd !== 'boolean' ||
      (value.paymentGraceEndsAt !== undefined && !isoDate(value.paymentGraceEndsAt)) ||
      (value.status === 'past_due') !== (value.paymentGraceEndsAt !== undefined) ||
      value.cancelAtPeriodEnd && !['trialing', 'active', 'past_due', 'paused'].includes(String(value.status))) return null
  return Object.freeze({
    id: value.id as string,
    planId: value.planId as BillingCheckoutPlanID,
    provider: value.provider as BillingPaymentMethod,
    renewalMode: value.renewalMode as BillingAccountSubscription['renewalMode'],
    status: value.status as BillingSubscriptionStatus,
    currentPeriodStart: value.currentPeriodStart,
    currentPeriodEnd: value.currentPeriodEnd,
    cancelAtPeriodEnd: value.cancelAtPeriodEnd,
    ...(typeof value.paymentGraceEndsAt === 'string' ? { paymentGraceEndsAt: value.paymentGraceEndsAt } : {}),
  })
}

export function parseBillingAccount(value: unknown): BillingAccount | null {
  if (!isRecord(value) || typeof value.customerExists !== 'boolean' || !isRecord(value.actions) ||
      typeof value.actions.canCancel !== 'boolean' || typeof value.actions.canManagePaymentMethod !== 'boolean' ||
      typeof value.actions.canPurchase !== 'boolean' || !(value.subscription === null || isRecord(value.subscription)) ||
      !(value.entitlement === null || isRecord(value.entitlement)) ||
      !(value.upcomingEntitlement === null || isRecord(value.upcomingEntitlement))) return null
  const subscription = value.subscription === null ? null : parseBillingAccountSubscription(value.subscription)
  const entitlement = value.entitlement === null ? null : parseBillingAccountEntitlement(value.entitlement)
  const upcomingEntitlement = value.upcomingEntitlement === null ? null : parseBillingAccountEntitlement(value.upcomingEntitlement)
  if ((value.subscription !== null && subscription === null) || (value.entitlement !== null && entitlement === null) ||
      (value.upcomingEntitlement !== null && upcomingEntitlement === null)) return null
  const actions = Object.freeze({
    canCancel: value.actions.canCancel,
    canManagePaymentMethod: value.actions.canManagePaymentMethod,
    canPurchase: value.actions.canPurchase,
  })
  if (!value.customerExists) {
    if (subscription !== null || entitlement !== null || upcomingEntitlement !== null || actions.canCancel ||
        actions.canManagePaymentMethod || !actions.canPurchase) return null
  }
  if (upcomingEntitlement !== null && (entitlement?.status !== 'active' || upcomingEntitlement.status !== 'scheduled' ||
      Date.parse(upcomingEntitlement.startsAt) < Date.parse(entitlement.expiresAt))) return null
  if (entitlement?.source.kind === 'stripe_subscription') {
    if (subscription === null || subscription.id !== entitlement.source.subscriptionId ||
        subscription.planId !== entitlement.planId || subscription.provider !== 'stripe' ||
        subscription.renewalMode !== 'automatic' || !['trialing', 'active', 'past_due', 'paused'].includes(subscription.status) ||
        Date.parse(subscription.currentPeriodStart) !== Date.parse(entitlement.startsAt) ||
        Date.parse(subscription.currentPeriodEnd) !== Date.parse(entitlement.expiresAt)) return null
  } else if (entitlement !== null && subscription !== null) return null
  if (subscription?.status === 'past_due' && entitlement === null) return null
  const cancelAllowed = subscription?.provider === 'stripe' && !subscription.cancelAtPeriodEnd &&
    ['active', 'past_due'].includes(subscription.status)
  if ((actions.canCancel && !cancelAllowed) || (actions.canManagePaymentMethod && subscription?.provider !== 'stripe')) return null
  return Object.freeze({ customerExists: value.customerExists, subscription, entitlement, upcomingEntitlement, actions })
}

export function parseBillingHistory(value: unknown): BillingHistory | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > 100 || !isRecord(value.actions) ||
      typeof value.actions.canViewStripeReceipts !== 'boolean') return null
  const result: BillingHistoryItem[] = []
  const orderIDs = new Set<string>()
  const orderNumbers = new Set<string>()
  const paymentIDs = new Set<string>()
  let paymentCount = 0
  let previousOrder: BillingHistoryItem | null = null
  let stripeInvoicePresent = false
  for (const item of value.items) {
    if (!isRecord(item) || !billingID(item.orderId, 'bord') || !safeText(item.orderNo, 64) ||
        !billingCheckoutPlanIDValid(String(item.planId || '')) || !['stripe', 'tao'].includes(String(item.provider)) ||
        !['one_time', 'subscription_initial', 'renewal'].includes(String(item.orderType)) ||
        !['automatic', 'manual', 'one_time'].includes(String(item.renewalMode)) ||
        !decimalUSD(item.amountUSD) || item.amountUSD === '0.00' ||
        !billingOrderLifecycleStatuses.includes(item.status as BillingOrderLifecycleStatus) || !isoDate(item.createdAt) ||
        (item.paidAt !== undefined && !isoDate(item.paidAt)) ||
        !['not_refunded', 'refunded'].includes(String(item.refundStatus)) ||
        (item.refundedAt !== undefined && !isoDate(item.refundedAt)) || !Array.isArray(item.payments) ||
        orderIDs.has(item.orderId as string) || orderNumbers.has(item.orderNo as string)) return null
    const exactRenewal = item.provider === 'tao'
      ? item.orderType === 'one_time' && item.renewalMode === 'manual'
      : item.orderType === 'one_time'
        ? item.renewalMode === 'one_time'
        : ['subscription_initial', 'renewal'].includes(String(item.orderType)) && item.renewalMode === 'automatic'
    const paidState = item.status === 'paid' || item.status === 'refunded'
    const refundedState = item.status === 'refunded'
    if (!exactRenewal || paidState !== (item.paidAt !== undefined) ||
        refundedState !== (item.refundStatus === 'refunded') || refundedState !== (item.refundedAt !== undefined) ||
        (item.paidAt !== undefined && Date.parse(item.paidAt as string) < Date.parse(item.createdAt as string)) ||
        (item.refundedAt !== undefined && Date.parse(item.refundedAt as string) < Date.parse(item.paidAt as string))) return null
    const payments: BillingHistoryPayment[] = []
    let previousPayment: BillingHistoryPayment | null = null
    let paidEvidence = false
    let refundEvidence = false
    for (const payment of item.payments) {
      if (!isRecord(payment) || !billingID(payment.paymentId, 'bpay') || paymentIDs.has(payment.paymentId as string) ||
          !['stripe_payment', 'stripe_invoice', 'tao_transaction'].includes(String(payment.kind)) ||
          !safeText(payment.status, 48) || !isoDate(payment.recordedAt) ||
          (payment.paidAt !== undefined && !isoDate(payment.paidAt)) ||
          (payment.finalizedAt !== undefined && !isoDate(payment.finalizedAt)) ||
          (payment.transactionHash !== undefined && (typeof payment.transactionHash !== 'string' || !/^0x[0-9a-f]{64}$/.test(payment.transactionHash))) ||
          (payment.transactionURL !== undefined && (typeof payment.transactionURL !== 'string' ||
            payment.transactionURL !== `https://taostats.io/extrinsic/${String(payment.transactionHash || '')}`))) return null
      const stripeStatus = ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'].includes(String(payment.status))
      const taoStatus = ['not_found', 'submitted', 'in_block', 'finalized', 'failed', 'reverted', 'duplicate',
        'invalid_recipient', 'invalid_amount', 'invalid_sender', 'expired_quote'].includes(String(payment.status))
      const exactProvider = item.provider === 'stripe'
        ? (payment.kind === 'stripe_payment' || payment.kind === 'stripe_invoice') && stripeStatus &&
          payment.finalizedAt === undefined && payment.transactionHash === undefined && payment.transactionURL === undefined
        : payment.kind === 'tao_transaction' && taoStatus && payment.paidAt === undefined &&
          ((payment.transactionHash === undefined) === (payment.transactionURL === undefined))
      const stripePaid = item.provider === 'stripe' && ['succeeded', 'refunded'].includes(String(payment.status))
      if (!exactProvider || (stripePaid !== (payment.paidAt !== undefined)) ||
          (payment.paidAt !== undefined && Date.parse(payment.paidAt as string) < Date.parse(payment.recordedAt as string)) ||
          (payment.finalizedAt !== undefined && Date.parse(payment.finalizedAt as string) < Date.parse(payment.recordedAt as string)) ||
          (stripePaid && payment.kind !== 'stripe_invoice') ||
          (payment.status === 'finalized' && (payment.finalizedAt === undefined || payment.transactionHash === undefined))) return null
      const parsedPayment = Object.freeze({
        paymentId: payment.paymentId as string,
        kind: payment.kind as BillingHistoryPayment['kind'],
        status: payment.status as BillingHistoryPayment['status'],
        recordedAt: payment.recordedAt as string,
        ...(typeof payment.paidAt === 'string' ? { paidAt: payment.paidAt } : {}),
        ...(typeof payment.finalizedAt === 'string' ? { finalizedAt: payment.finalizedAt } : {}),
        ...(typeof payment.transactionHash === 'string' ? { transactionHash: payment.transactionHash } : {}),
        ...(typeof payment.transactionURL === 'string' ? { transactionURL: payment.transactionURL } : {}),
      })
      if (previousPayment !== null && !billingHistoryRecordPrecedes(previousPayment.recordedAt, previousPayment.paymentId,
        parsedPayment.recordedAt, parsedPayment.paymentId)) return null
      previousPayment = parsedPayment
      paymentIDs.add(parsedPayment.paymentId)
      paymentCount += 1
      if (paymentCount > 200) return null
      stripeInvoicePresent = stripeInvoicePresent || parsedPayment.kind === 'stripe_invoice'
      paidEvidence = paidEvidence || (item.provider === 'stripe'
        ? ['succeeded', 'refunded'].includes(parsedPayment.status)
        : parsedPayment.status === 'finalized')
      refundEvidence = refundEvidence || parsedPayment.status === 'refunded'
      payments.push(parsedPayment)
    }
    if ((item.status === 'paid' && (!paidEvidence || refundEvidence)) ||
        (item.status === 'refunded' && (!paidEvidence || item.provider === 'stripe' && !refundEvidence)) ||
        (!paidState && (paidEvidence || refundEvidence))) return null
    const parsedItem = Object.freeze({
      orderId: item.orderId as string,
      orderNo: item.orderNo as string,
      planId: item.planId as BillingCheckoutPlanID,
      provider: item.provider as BillingPaymentMethod,
      orderType: item.orderType as BillingHistoryItem['orderType'],
      renewalMode: item.renewalMode as BillingHistoryItem['renewalMode'],
      amountUSD: item.amountUSD as string,
      status: item.status as BillingOrderLifecycleStatus,
      createdAt: item.createdAt as string,
      ...(typeof item.paidAt === 'string' ? { paidAt: item.paidAt } : {}),
      refundStatus: item.refundStatus as BillingHistoryItem['refundStatus'],
      ...(typeof item.refundedAt === 'string' ? { refundedAt: item.refundedAt } : {}),
      payments: Object.freeze(payments),
    })
    if (previousOrder !== null && !billingHistoryRecordPrecedes(previousOrder.createdAt, previousOrder.orderId,
      parsedItem.createdAt, parsedItem.orderId)) return null
    previousOrder = parsedItem
    orderIDs.add(parsedItem.orderId)
    orderNumbers.add(parsedItem.orderNo)
    result.push(parsedItem)
  }
  if (value.actions.canViewStripeReceipts && !stripeInvoicePresent) return null
  return Object.freeze({
    items: Object.freeze(result),
    actions: Object.freeze({ canViewStripeReceipts: value.actions.canViewStripeReceipts }),
  })
}

function billingHistoryRecordPrecedes(previousTime: string, previousID: string, currentTime: string, currentID: string) {
  const previous = Date.parse(previousTime)
  const current = Date.parse(currentTime)
  return previous > current || previous === current && previousID > currentID
}

function parseBillingOrderEntitlementOutcome(
  value: unknown,
  orderID: string,
  planID: BillingCheckoutPlanID,
  status: BillingOrderEntitlementStatus,
): BillingOrderEntitlementOutcome | null | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value) || !billingID(value.id, 'bent') || value.orderId !== orderID || value.planId !== planID ||
      !['scheduled', 'active', 'expired', 'revoked'].includes(String(value.status)) || value.status !== status ||
      !isoDate(value.startsAt) || !isoDate(value.expiresAt) || Date.parse(value.expiresAt) <= Date.parse(value.startsAt)) return null
  return Object.freeze({
    id: value.id as string,
    orderId: value.orderId as string,
    planId: value.planId as BillingCheckoutPlanID,
    status: value.status as BillingOrderEntitlementOutcome['status'],
    startsAt: value.startsAt,
    expiresAt: value.expiresAt,
  })
}

function parseBillingOrderSubscriptionOutcome(
  value: unknown,
  subscriptionID: unknown,
  orderID: string,
  planID: BillingCheckoutPlanID,
  provider: BillingPaymentMethod,
): BillingOrderSubscriptionOutcome | null | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value) || !billingID(value.id, 'bsub') || value.id !== subscriptionID || value.initialOrderId !== orderID ||
      value.planId !== planID || value.provider !== provider || !['automatic', 'manual'].includes(String(value.renewalMode)) ||
      (provider === 'stripe' ? value.renewalMode !== 'automatic' : value.renewalMode !== 'manual') ||
      !billingSubscriptionStatuses.includes(value.status as BillingSubscriptionStatus) ||
      !isoDate(value.currentPeriodStart) || !isoDate(value.currentPeriodEnd) ||
      Date.parse(value.currentPeriodEnd) <= Date.parse(value.currentPeriodStart) || typeof value.cancelAtPeriodEnd !== 'boolean') return null
  return Object.freeze({
    id: value.id as string,
    initialOrderId: value.initialOrderId as string,
    planId: value.planId as BillingCheckoutPlanID,
    provider: value.provider as BillingPaymentMethod,
    renewalMode: value.renewalMode as BillingOrderSubscriptionOutcome['renewalMode'],
    status: value.status as BillingSubscriptionStatus,
    currentPeriodStart: value.currentPeriodStart,
    currentPeriodEnd: value.currentPeriodEnd,
    cancelAtPeriodEnd: value.cancelAtPeriodEnd,
  })
}

export function parseBillingOrderStatus(value: unknown): BillingOrderStatus | null {
  if (!isRecord(value) || !billingID(value.id, 'bord') || !safeText(value.orderNo, 64) ||
      !billingCheckoutPlanIDValid(String(value.planId || '')) || !['stripe', 'tao'].includes(String(value.provider)) ||
      !billingOrderLifecycleStatuses.includes(value.status as BillingOrderLifecycleStatus) ||
      !billingPaymentStatuses.includes(value.paymentStatus as BillingPaymentStatus) ||
      !billingOrderEntitlementStatuses.includes(value.entitlementStatus as BillingOrderEntitlementStatus) ||
      (value.expiresAt !== undefined && !isoDate(value.expiresAt)) ||
      (value.subscriptionId !== undefined && !billingID(value.subscriptionId, 'bsub'))) return null
  const orderID = value.id as string
  const planID = value.planId as BillingCheckoutPlanID
  const provider = value.provider as BillingPaymentMethod
  const entitlementStatus = value.entitlementStatus as BillingOrderEntitlementStatus
  const entitlement = parseBillingOrderEntitlementOutcome(value.entitlement, orderID, planID, entitlementStatus)
  const subscription = parseBillingOrderSubscriptionOutcome(value.subscription, value.subscriptionId, orderID, planID, provider)
  const entitlementOutcomeRequired = !['pending', 'inactive'].includes(entitlementStatus)
  if (entitlement === null || subscription === null || entitlementOutcomeRequired !== (entitlement !== undefined) ||
      (value.subscriptionId !== undefined) !== (subscription !== undefined)) return null
  let failure: BillingOrderStatus['failure'] = null
  if (value.failure !== null) {
    if (!isRecord(value.failure) || !safeText(value.failure.code, 64) || !safeText(value.failure.message, 240)) return null
    failure = Object.freeze({ code: value.failure.code as string, message: value.failure.message as string })
  }
  return Object.freeze({
    id: orderID,
    orderNo: value.orderNo as string,
    planId: planID,
    provider,
    status: value.status as BillingOrderLifecycleStatus,
    paymentStatus: value.paymentStatus as BillingPaymentStatus,
    entitlementStatus,
    ...(typeof value.expiresAt === 'string' ? { expiresAt: value.expiresAt } : {}),
    ...(typeof value.subscriptionId === 'string' ? { subscriptionId: value.subscriptionId } : {}),
    ...(entitlement ? { entitlement } : {}),
    ...(subscription ? { subscription } : {}),
    failure,
  })
}

function publishableKeyMode(value: string) {
  if (value.length > 512) return ''
  if (/^pk_test_[A-Za-z0-9_]{8,}$/.test(value)) return 'test'
  if (/^pk_live_[A-Za-z0-9_]{8,}$/.test(value)) return 'live'
  return ''
}

export function stripeCheckoutPlanIDValid(value: string): value is StripeCheckoutPlanID {
  return billingCheckoutPlanIDValid(value)
}

export function billingCheckoutPlanIDValid(value: string): value is BillingCheckoutPlanID {
  return billingCheckoutPlanIDs.some((planID) => planID === value)
}

export function billingUpgradePlanIDFromSearch(search: string): BillingCheckoutPlanID | null {
  if (typeof search !== 'string' || search.length > 2048) return null
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const planID = params.get('plan')
  return planID !== null && billingCheckoutPlanIDValid(planID) ? planID : null
}

export function billingStripeReturnFromSearch(search: string): BillingStripeReturnReference | null {
  if (typeof search !== 'string' || search.length > 2048) return null
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const markers = params.getAll('stripe_return')
  const orderIDs = params.getAll('order_id')
  if (markers.length !== 1 || markers[0] !== '1' || orderIDs.length !== 1 ||
      !/^bord_[A-Za-z0-9_-]+$/.test(orderIDs[0]) || params.has('client_secret') || params.has('session_id')) return null
  return Object.freeze({ orderId: orderIDs[0] })
}

export function parseBillingStripePublicConfig(value: unknown): BillingStripePublicConfig | null {
  const config = parseBillingPublicConfig(value)
  if (!config?.stripe.enabled) return null
  return {
    enabled: true,
    publishableKey: config.stripe.publishableKey,
    liveMode: config.stripe.liveMode,
    paymentElementEnabled: config.stripe.paymentElementEnabled,
    expressCheckoutEnabled: config.stripe.expressCheckoutEnabled,
  }
}

export function parseBillingStripeCheckoutSession(
  value: unknown,
  config: BillingStripePublicConfig,
): BillingStripeCheckoutSession | null {
  if (!isRecord(value) || value.integrationMode !== 'elements' || value.checkoutUrl !== null) return null
  if (typeof value.orderId !== 'string' || !/^bord_[A-Za-z0-9_-]+$/.test(value.orderId)) return null
  if (typeof value.providerSessionId !== 'string' || typeof value.clientSecret !== 'string') return null
  const expectedSessionPrefix = config.liveMode ? 'cs_live_' : 'cs_test_'
  if (!new RegExp(`^${expectedSessionPrefix}[A-Za-z0-9]+$`).test(value.providerSessionId) ||
      !value.clientSecret.startsWith(`${value.providerSessionId}_secret_`) || value.clientSecret.length > 1024) return null
  if (value.subscriptionId !== undefined &&
      (typeof value.subscriptionId !== 'string' || !/^bsub_[A-Za-z0-9_-]+$/.test(value.subscriptionId))) return null
  const session: BillingStripeCheckoutSession = {
    orderId: value.orderId,
    integrationMode: 'elements',
    providerSessionId: value.providerSessionId,
    clientSecret: value.clientSecret,
    checkoutUrl: null,
  }
  if (typeof value.subscriptionId === 'string') session.subscriptionId = value.subscriptionId
  return session
}
