import {
  billingCreditMicrosValid,
  billingOrderLifecycleStatuses,
  billingPaymentStatuses,
  billingTopupProductIDValid,
  parseBillingHistory,
  type BillingOrderLifecycleStatus,
  type BillingPaymentMethod,
  type BillingPaymentStatus,
} from './billingTypes'

export const billingTopupCreditStatuses = ['pending', 'credited', 'reversed', 'not_applicable'] as const

export type BillingTopupCreditStatus = (typeof billingTopupCreditStatuses)[number]

export type BillingTopupCredit = Readonly<{
  ledgerEntryId: string
  deltaMicros: string
  balanceMicros: string
  creditedAt: string
  refundEntryId?: string
  reversedAt?: string
}>

export type BillingTopupOrderStatus = Readonly<{
  id: string
  orderNo: string
  productId: string
  provider: BillingPaymentMethod
  status: BillingOrderLifecycleStatus
  paymentStatus: BillingPaymentStatus
  creditStatus: BillingTopupCreditStatus
  paidMicros: string
  creditedMicros: string
  expiresAt?: string
  credit: BillingTopupCredit | null
  failure: null | Readonly<{ code: string; message: string }>
}>

export type BillingTopupHistoryPayment = Readonly<{
  paymentId: string
  kind: 'stripe_payment' | 'stripe_invoice' | 'tao_transaction'
  status: string
  recordedAt: string
  paidAt?: string
  finalizedAt?: string
  transactionHash?: string
  transactionURL?: string
}>

export type BillingTopupHistoryItem = Readonly<{
  orderId: string
  orderNo: string
  productId: string
  provider: BillingPaymentMethod
  amountUSD: string
  paidMicros: string
  creditedMicros: string
  status: BillingOrderLifecycleStatus
  creditStatus: BillingTopupCreditStatus
  createdAt: string
  paidAt?: string
  refundStatus: 'not_refunded' | 'refunded'
  refundedAt?: string
  credit: BillingTopupCredit | null
  payments: readonly BillingTopupHistoryPayment[]
}>

export type BillingTopupHistory = Readonly<{
  items: readonly BillingTopupHistoryItem[]
}>

type UnknownRecord = Record<string, unknown>

const orderStatusKeys = new Set([
  'credit', 'creditedMicros', 'creditStatus', 'entitlementStatus', 'expiresAt', 'failure', 'id',
  'orderNo', 'paidMicros', 'paymentStatus', 'planId', 'productId', 'provider', 'status',
])
const historyItemKeys = new Set([
  'amountUSD', 'createdAt', 'credit', 'creditedMicros', 'creditStatus', 'orderId', 'orderNo',
  'orderType', 'paidAt', 'paidMicros', 'payments', 'planId', 'provider', 'purchaseKind',
  'refundedAt', 'refundStatus', 'renewalMode', 'status',
])
const historyPaymentKeys = new Set([
  'finalizedAt', 'kind', 'paidAt', 'paymentId', 'recordedAt', 'status', 'transactionHash', 'transactionURL',
])
const creditKeys = new Set([
  'balanceMicros', 'creditedAt', 'deltaMicros', 'ledgerEntryId', 'refundEntryId', 'reversedAt',
])

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function onlyKnownKeys(value: UnknownRecord, allowed: ReadonlySet<string>) {
  return Object.keys(value).every((key) => allowed.has(key))
}

function billingID(value: unknown, prefix: string) {
  return typeof value === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9_-]+$`).test(value)
}

function safeText(value: unknown, maximum: number) {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= maximum
}

function isoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
}

function positiveMicros(value: unknown): value is string {
  return billingCreditMicrosValid(value) && BigInt(value) > 0n
}

function decimalUSD(value: unknown): value is string {
  return typeof value === 'string' && /^(?:0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(value) && value !== '0.00'
}

function decimalUSDMicros(value: string) {
  const [whole, cents] = value.split('.')
  return BigInt(whole) * 1_000_000n + BigInt(cents) * 10_000n
}

function parseTopupCredit(value: unknown, creditedMicros: string, status: BillingTopupCreditStatus): BillingTopupCredit | null {
  if (!isRecord(value) || !onlyKnownKeys(value, creditKeys) || !billingID(value.ledgerEntryId, 'tok') ||
      value.deltaMicros !== creditedMicros || !billingCreditMicrosValid(value.balanceMicros) || !isoDate(value.creditedAt)) return null
  const reversed = status === 'reversed'
  if (reversed !== billingID(value.refundEntryId, 'tok') || reversed !== isoDate(value.reversedAt)) return null
  if (reversed && Date.parse(value.reversedAt as string) < Date.parse(value.creditedAt)) return null
  return Object.freeze({
    ledgerEntryId: value.ledgerEntryId as string,
    deltaMicros: value.deltaMicros as string,
    balanceMicros: value.balanceMicros as string,
    creditedAt: value.creditedAt,
    ...(reversed ? { refundEntryId: value.refundEntryId as string, reversedAt: value.reversedAt as string } : {}),
  })
}

function topupStateConsistent(
  provider: BillingPaymentMethod,
  status: BillingOrderLifecycleStatus,
  paymentStatus: string,
  creditStatus: BillingTopupCreditStatus,
  credit: BillingTopupCredit | null,
) {
  if (status === 'paid') {
    return creditStatus === 'credited' && credit !== null &&
      (provider === 'tao' ? paymentStatus === 'finalized' : paymentStatus === 'succeeded')
  }
  if (status === 'refunded') {
    return creditStatus === 'reversed' && credit !== null &&
      (provider === 'tao' ? paymentStatus === 'finalized' : paymentStatus === 'refunded')
  }
  if (['failed', 'expired', 'underpaid', 'overpaid', 'manual_review', 'canceled'].includes(status)) {
    return creditStatus === 'not_applicable' && credit === null
  }
  return creditStatus === 'pending' && credit === null
}

export function parseBillingTopupOrderStatus(value: unknown): BillingTopupOrderStatus | null {
  if (!isRecord(value) || !onlyKnownKeys(value, orderStatusKeys) || !billingID(value.id, 'bord') ||
      !safeText(value.orderNo, 64) || !billingTopupProductIDValid(value.productId) || value.planId !== value.productId ||
      !['tao', 'stripe'].includes(String(value.provider)) ||
      !billingOrderLifecycleStatuses.includes(value.status as BillingOrderLifecycleStatus) ||
      !billingPaymentStatuses.includes(value.paymentStatus as BillingPaymentStatus) ||
      value.entitlementStatus !== 'not_applicable' || !positiveMicros(value.paidMicros) ||
      !positiveMicros(value.creditedMicros) || (value.expiresAt !== undefined && !isoDate(value.expiresAt))) return null
  const creditStatus = value.creditStatus as BillingTopupCreditStatus
  if (!billingTopupCreditStatuses.includes(creditStatus)) return null
  const credit = value.credit === null ? null : parseTopupCredit(value.credit, value.creditedMicros, creditStatus)
  if (value.credit !== null && credit === null) return null
  const provider = value.provider as BillingPaymentMethod
  const status = value.status as BillingOrderLifecycleStatus
  if (!topupStateConsistent(provider, status, String(value.paymentStatus), creditStatus, credit)) return null
  let failure: BillingTopupOrderStatus['failure'] = null
  if (value.failure !== null) {
    if (!isRecord(value.failure) || Object.keys(value.failure).length !== 2 ||
        !safeText(value.failure.code, 64) || !safeText(value.failure.message, 240)) return null
    failure = Object.freeze({ code: value.failure.code as string, message: value.failure.message as string })
  }
  return Object.freeze({
    id: value.id as string,
    orderNo: value.orderNo as string,
    productId: value.productId,
    provider,
    status,
    paymentStatus: value.paymentStatus as BillingPaymentStatus,
    creditStatus,
    paidMicros: value.paidMicros,
    creditedMicros: value.creditedMicros,
    ...(typeof value.expiresAt === 'string' ? { expiresAt: value.expiresAt } : {}),
    credit,
    failure,
  })
}

function parseTopupHistoryPayment(value: unknown, provider: BillingPaymentMethod): BillingTopupHistoryPayment | null {
  if (!isRecord(value) || !onlyKnownKeys(value, historyPaymentKeys) || !billingID(value.paymentId, 'bpay') ||
      !safeText(value.status, 48) || !isoDate(value.recordedAt) ||
      (value.paidAt !== undefined && !isoDate(value.paidAt)) ||
      (value.finalizedAt !== undefined && !isoDate(value.finalizedAt)) ||
      (value.transactionHash !== undefined && (typeof value.transactionHash !== 'string' || !/^0x[0-9a-f]{64}$/.test(value.transactionHash))) ||
      (value.transactionURL !== undefined && value.transactionURL !== `https://taostats.io/extrinsic/${String(value.transactionHash ?? '')}`)) return null
  const tao = provider === 'tao'
  const taoStatus = ['not_found', 'submitted', 'in_block', 'finalized', 'failed', 'reverted', 'duplicate',
    'invalid_recipient', 'invalid_amount', 'invalid_sender', 'expired_quote'].includes(String(value.status))
  const stripeStatus = ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'].includes(String(value.status))
  if (tao !== (value.kind === 'tao_transaction') || (tao ? !taoStatus :
    !['stripe_payment', 'stripe_invoice'].includes(String(value.kind)) || !stripeStatus)) return null
  if (tao && (value.paidAt !== undefined || (value.transactionHash === undefined) !== (value.transactionURL === undefined) ||
      (value.status === 'finalized') !== (value.finalizedAt !== undefined))) return null
  if (!tao && (value.finalizedAt !== undefined || value.transactionHash !== undefined || value.transactionURL !== undefined)) return null
  return Object.freeze({
    paymentId: value.paymentId as string,
    kind: value.kind as BillingTopupHistoryPayment['kind'],
    status: value.status as string,
    recordedAt: value.recordedAt,
    ...(typeof value.paidAt === 'string' ? { paidAt: value.paidAt } : {}),
    ...(typeof value.finalizedAt === 'string' ? { finalizedAt: value.finalizedAt } : {}),
    ...(typeof value.transactionHash === 'string' ? { transactionHash: value.transactionHash } : {}),
    ...(typeof value.transactionURL === 'string' ? { transactionURL: value.transactionURL } : {}),
  })
}

function parseTopupHistoryItem(value: unknown): BillingTopupHistoryItem | null {
  if (!isRecord(value) || !onlyKnownKeys(value, historyItemKeys) || value.purchaseKind !== 'topup' ||
      !billingID(value.orderId, 'bord') || !safeText(value.orderNo, 64) ||
      !billingTopupProductIDValid(value.planId) || !['tao', 'stripe'].includes(String(value.provider)) ||
      value.orderType !== 'one_time' || !decimalUSD(value.amountUSD) || !positiveMicros(value.paidMicros) ||
      decimalUSDMicros(value.amountUSD) !== BigInt(value.paidMicros) || !positiveMicros(value.creditedMicros) ||
      !billingOrderLifecycleStatuses.includes(value.status as BillingOrderLifecycleStatus) || !isoDate(value.createdAt) ||
      (value.paidAt !== undefined && !isoDate(value.paidAt)) ||
      !['not_refunded', 'refunded'].includes(String(value.refundStatus)) ||
      (value.refundedAt !== undefined && !isoDate(value.refundedAt)) || !Array.isArray(value.payments) || value.payments.length > 20) return null
  const provider = value.provider as BillingPaymentMethod
  if ((provider === 'tao' && value.renewalMode !== 'manual') || (provider === 'stripe' && value.renewalMode !== 'one_time')) return null
  const status = value.status as BillingOrderLifecycleStatus
  const paid = status === 'paid' || status === 'refunded'
  const refunded = status === 'refunded'
  if (paid !== (value.paidAt !== undefined) || refunded !== (value.refundStatus === 'refunded') ||
      refunded !== (value.refundedAt !== undefined)) return null
  const creditStatus = value.creditStatus as BillingTopupCreditStatus
  if (!billingTopupCreditStatuses.includes(creditStatus)) return null
  const credit = value.credit === null ? null : parseTopupCredit(value.credit, value.creditedMicros, creditStatus)
  if (value.credit !== null && credit === null) return null
  const payments: BillingTopupHistoryPayment[] = []
  const paymentIDs = new Set<string>()
  for (const candidate of value.payments) {
    const payment = parseTopupHistoryPayment(candidate, provider)
    if (payment === null || paymentIDs.has(payment.paymentId)) return null
    if (payments.length > 0 && !recordPrecedes(payments[payments.length - 1].recordedAt, payments[payments.length - 1].paymentId,
      payment.recordedAt, payment.paymentId)) return null
    paymentIDs.add(payment.paymentId)
    payments.push(payment)
  }
  const paymentStatus = payments[0]?.status ?? 'waiting'
  if (!topupStateConsistent(provider, status, paymentStatus, creditStatus, credit)) return null
  return Object.freeze({
    orderId: value.orderId as string,
    orderNo: value.orderNo as string,
    productId: value.planId,
    provider,
    amountUSD: value.amountUSD,
    paidMicros: value.paidMicros,
    creditedMicros: value.creditedMicros,
    status,
    creditStatus,
    createdAt: value.createdAt,
    ...(typeof value.paidAt === 'string' ? { paidAt: value.paidAt } : {}),
    refundStatus: value.refundStatus as BillingTopupHistoryItem['refundStatus'],
    ...(typeof value.refundedAt === 'string' ? { refundedAt: value.refundedAt } : {}),
    credit,
    payments: Object.freeze(payments),
  })
}

function recordPrecedes(previousTime: string, previousID: string, currentTime: string, currentID: string) {
  const previous = Date.parse(previousTime)
  const current = Date.parse(currentTime)
  return previous > current || previous === current && previousID > currentID
}

export function parseBillingTopupHistory(value: unknown): BillingTopupHistory | null {
  if (!isRecord(value) || Object.keys(value).some((key) => !['actions', 'items'].includes(key)) ||
      !Array.isArray(value.items) || value.items.length > 100 || !isRecord(value.actions) ||
      typeof value.actions.canViewStripeReceipts !== 'boolean') return null
  const legacyItems = value.items.filter((item) => isRecord(item) && item.purchaseKind !== 'topup')
  if (legacyItems.length > 0 && parseBillingHistory({ items: legacyItems, actions: value.actions }) === null) return null
  const result: BillingTopupHistoryItem[] = []
  let previousRaw: UnknownRecord | null = null
  for (const candidate of value.items) {
    if (!isRecord(candidate) || !isoDate(candidate.createdAt) || !billingID(candidate.orderId, 'bord')) return null
    if (previousRaw !== null && !recordPrecedes(previousRaw.createdAt as string, previousRaw.orderId as string,
      candidate.createdAt, candidate.orderId as string)) return null
    previousRaw = candidate
    if (candidate.purchaseKind !== 'topup') continue
    const item = parseTopupHistoryItem(candidate)
    if (item === null) return null
    result.push(item)
  }
  return Object.freeze({ items: Object.freeze(result) })
}

export type BillingTopupPollingDecision = 'continue' | 'success' | 'terminal'

export function billingTopupPollingDecision(status: BillingTopupOrderStatus): BillingTopupPollingDecision {
  if (status.status === 'paid' && status.creditStatus === 'credited' && status.credit !== null) return 'success'
  if (['failed', 'expired', 'underpaid', 'overpaid', 'manual_review', 'refunded', 'canceled'].includes(status.status)) return 'terminal'
  return 'continue'
}
