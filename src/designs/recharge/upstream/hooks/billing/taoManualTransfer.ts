import type { BillingTopupProduct } from '../../billingTypes'
import { billingCreditMicrosValid, billingTopupProductIDValid } from '../../billingTypes'
import { canonicalizeBittensorInjectedAddress } from './injectedTaoWalletConnector'
import { pageText } from '../../i18n/pageText'

export const taoManualPaymentOption = Object.freeze({
  id: 'manual_transfer',
  get label() { return pageText('dynamic.billing.payFromAnotherWallet') },
  alwaysAvailable: true,
} as const)

export const taoManualNetwork = Object.freeze({
  id: 'bittensor_mainnet',
  get label() { return pageText('dynamic.billing.bittensorMainnet') },
} as const)

export const taoManualTransferNotices = Object.freeze({
  get exactAmount() { return pageText('dynamic.billing.exactTaoAmount') },
  get networkFee() { return pageText('dynamic.billing.networkFeeSeparate') },
  get verification() { return pageText('dynamic.billing.finalizedVerification') },
} as const)

export type BillingTaoCheckout = Readonly<{
  orderId: string
  orderNo: string
  productId: string
  paidMicros: string
  creditedMicros: string
  network: 'bittensor_mainnet'
  recipientAddress: string
  senderAddress: string
  fiat: Readonly<{
    currency: 'USD'
    amount: string
  }>
  crypto: Readonly<{
    currency: 'TAO'
    amount: string
    amountRao: string
  }>
  quoteExpiresAt: string
  autoRenew: false
}>

export type TaoManualTransferInstructions = Readonly<{
  phase: 'awaiting_transfer'
  paymentMethod: 'manual_transfer'
  orderId: string
  orderNo: string
  productId: string
  paidMicros: string
  creditedMicros: string
  network: 'bittensor_mainnet'
  networkLabel: 'Bittensor Mainnet'
  recipientAddress: string
  senderAddress: string
  fiatAmountUSD: string
  amountTao: string
  amountRao: string
  quoteExpiresAt: string
  autoRenew: false
  qrPayload: string
  copy: Readonly<{
    recipientAddress: string
    amountTao: string
    amountRao: string
    orderNo: string
  }>
  notices: typeof taoManualTransferNotices
  transactionReferenceSubmission: 'available'
}>

export type TaoManualCheckoutRequest = Readonly<{
  productId: string
  amountMicros?: string
  walletAddress: string
  idempotencyKey: string
  signal: AbortSignal
}>

export type TaoManualCheckoutRequester = (request: TaoManualCheckoutRequest) => Promise<unknown>

export type TaoManualCheckoutResult = Readonly<{
  attemptVersion: number
  instructions: TaoManualTransferInstructions
}>

export const taoManualCheckoutErrorCodes = Object.freeze([
  'manual_sender_invalid',
  'manual_checkout_response_invalid',
  'manual_quote_expired',
  'manual_checkout_aborted',
] as const)

export type TaoManualCheckoutErrorCode = (typeof taoManualCheckoutErrorCodes)[number]

const taoManualCheckoutErrorMessages: Readonly<Record<TaoManualCheckoutErrorCode, string>> = Object.freeze({
  manual_sender_invalid: 'Enter a valid Bittensor sender address.',
  manual_checkout_response_invalid: 'Manual TAO payment instructions could not be verified. Start a new payment.',
  manual_quote_expired: 'This TAO quote has expired. Start a new payment to get a fresh quote.',
  manual_checkout_aborted: 'Manual TAO payment preparation was canceled.',
})

export class TaoManualCheckoutError extends Error {
  readonly code: TaoManualCheckoutErrorCode

  constructor(code: TaoManualCheckoutErrorCode) {
    super(taoManualCheckoutErrorMessages[code])
    this.name = 'TaoManualCheckoutError'
    this.code = code
  }
}

type UnknownRecord = Record<string, unknown>

const checkoutKeys = Object.freeze([
  'autoRenew',
  'creditedMicros',
  'crypto',
  'fiat',
  'network',
  'orderId',
  'orderNo',
  'paidMicros',
  'productId',
  'quoteExpiresAt',
  'recipientAddress',
  'senderAddress',
] as const)
const fiatAmountKeys = Object.freeze(['amount', 'currency'] as const)
const cryptoAmountKeys = Object.freeze(['amount', 'amountRao', 'currency'] as const)
const maximumRao = (1n << 128n) - 1n

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: UnknownRecord, expected: readonly string[]) {
  const keys = Object.keys(value).sort()
  return keys.length === expected.length && keys.every((key, index) => key === expected[index])
}

function canonicalBittensorAddress(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return canonicalizeBittensorInjectedAddress(value) === value
  } catch {
    return false
  }
}

function fiatAmountValid(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(value)) return false
  const minorUnits = BigInt(value.replace('.', ''))
  return minorUnits > 0n && minorUnits <= 9_223_372_036_854_775_807n
}

function fiatAmountMicros(value: string) {
  const [whole, cents] = value.split('.')
  return BigInt(whole) * 1_000_000n + BigInt(cents) * 10_000n
}

export function exactTaoAmountToRao(value: unknown): string | null {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,29})\.[0-9]{9}$/.test(value)) return null
  const rao = BigInt(value.replace('.', ''))
  if (rao <= 0n || rao > maximumRao) return null
  return rao.toString()
}

export type TaoTransactionReference = Readonly<{
  kind: 'extrinsic_hash' | 'extrinsic_id'
  value: string
}>

export type TaoTransactionSubmission = Readonly<{
  orderId: string
  orderNo: string
  network: 'bittensor_mainnet'
  transactionReference: TaoTransactionReference
  senderAddress: string
  orderStatus: 'submitted' | 'confirming' | 'manual_review'
  verificationStatus: 'pending_finalized_verification' | 'manual_review'
}>

export type TaoCheckoutCancellation = Readonly<{
  orderId: string
  deleted: true
}>

const checkoutCancellationKeys = Object.freeze(['deleted', 'orderId'] as const)

export function parseTaoCheckoutCancellation(value: unknown, expectedOrderId: string): TaoCheckoutCancellation | null {
  if (!isRecord(value) || !exactKeys(value, checkoutCancellationKeys) ||
      value.orderId !== expectedOrderId || value.deleted !== true) return null
  return Object.freeze({ orderId: value.orderId, deleted: true })
}

export function canonicalTaoTransactionReference(input: string): TaoTransactionReference | null {
  const value = input.trim()
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) {
    return Object.freeze({ kind: 'extrinsic_hash', value: value.toLowerCase() })
  }
  if (/^(?:0|[1-9][0-9]{0,19})-(?:0|[1-9][0-9]{0,9})$/.test(value)) {
    return Object.freeze({ kind: 'extrinsic_id', value })
  }
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return null
    const prefix = url.hostname === 'taostats.io'
      ? '/extrinsic/'
      : url.hostname === 'bittensor.ai'
        ? '/explorer/extrinsic/'
        : ''
    if (!prefix || !url.pathname.startsWith(prefix) || url.pathname.slice(prefix.length).includes('/')) return null
    return canonicalTaoTransactionReference(url.pathname.slice(prefix.length))
  } catch {
    return null
  }
}

const transactionSubmissionKeys = Object.freeze([
  'network',
  'orderId',
  'orderNo',
  'orderStatus',
  'senderAddress',
  'transactionReference',
  'verificationStatus',
] as const)
const transactionReferenceKeys = Object.freeze(['kind', 'value'] as const)

export function parseTaoTransactionSubmission(
  value: unknown,
  expected: Readonly<{ orderId: string; senderAddress: string; transactionReference: TaoTransactionReference }>,
): TaoTransactionSubmission | null {
  if (!isRecord(value) || !exactKeys(value, transactionSubmissionKeys) ||
      value.network !== 'bittensor_mainnet' || value.orderId !== expected.orderId ||
      typeof value.orderNo !== 'string' || value.orderNo.length < 6 || value.orderNo.length > 64 ||
      !/^[A-Za-z0-9_-]+$/.test(value.orderNo) || value.senderAddress !== expected.senderAddress ||
      !canonicalBittensorAddress(value.senderAddress) || !isRecord(value.transactionReference) ||
      !exactKeys(value.transactionReference, transactionReferenceKeys) ||
      value.transactionReference.kind !== expected.transactionReference.kind ||
      value.transactionReference.value !== expected.transactionReference.value ||
      !['submitted', 'confirming', 'manual_review'].includes(String(value.orderStatus)) ||
      !['pending_finalized_verification', 'manual_review'].includes(String(value.verificationStatus)) ||
      (value.verificationStatus === 'manual_review') !== (value.orderStatus === 'manual_review')) return null
  return Object.freeze({
    orderId: value.orderId,
    orderNo: value.orderNo,
    network: 'bittensor_mainnet',
    transactionReference: Object.freeze({
      kind: value.transactionReference.kind as TaoTransactionReference['kind'],
      value: value.transactionReference.value as string,
    }),
    senderAddress: value.senderAddress,
    orderStatus: value.orderStatus as TaoTransactionSubmission['orderStatus'],
    verificationStatus: value.verificationStatus as TaoTransactionSubmission['verificationStatus'],
  })
}

function quoteExpiryValid(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value)) return false
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(value)
  if (parts === null) return false
  const parsed = new Date(0)
  parsed.setUTCFullYear(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
  parsed.setUTCHours(Number(parts[4]), Number(parts[5]), Number(parts[6]), 0)
  return Number.isFinite(parsed.getTime()) && parsed.getUTCFullYear() === Number(parts[1]) &&
    parsed.getUTCMonth() === Number(parts[2]) - 1 && parsed.getUTCDate() === Number(parts[3]) &&
    parsed.getUTCHours() === Number(parts[4]) && parsed.getUTCMinutes() === Number(parts[5]) &&
    parsed.getUTCSeconds() === Number(parts[6])
}

export function parseBillingTaoCheckout(value: unknown): BillingTaoCheckout | null {
  if (!isRecord(value) || !exactKeys(value, checkoutKeys) || value.network !== taoManualNetwork.id ||
      value.autoRenew !== false || typeof value.orderId !== 'string' || !/^bord_[0-9]{6,20}$/.test(value.orderId) ||
      typeof value.orderNo !== 'string' || value.orderNo.length < 6 || value.orderNo.length > 64 ||
      !/^[A-Za-z0-9_-]+$/.test(value.orderNo) || !billingTopupProductIDValid(value.productId) ||
      !billingCreditMicrosValid(value.paidMicros) || BigInt(value.paidMicros) <= 0n ||
      !billingCreditMicrosValid(value.creditedMicros) || BigInt(value.creditedMicros) <= 0n ||
      !canonicalBittensorAddress(value.senderAddress) ||
      !canonicalBittensorAddress(value.recipientAddress) || value.senderAddress === value.recipientAddress ||
      !quoteExpiryValid(value.quoteExpiresAt) || !isRecord(value.fiat) || !exactKeys(value.fiat, fiatAmountKeys) ||
      value.fiat.currency !== 'USD' || !fiatAmountValid(value.fiat.amount) || !isRecord(value.crypto) ||
      !exactKeys(value.crypto, cryptoAmountKeys) || value.crypto.currency !== 'TAO' ||
      typeof value.crypto.amountRao !== 'string' || !/^[1-9][0-9]{0,38}$/.test(value.crypto.amountRao)) return null

  const fiatAmount = value.fiat.amount as string
  const cryptoAmount = value.crypto.amount as string
  const amountRao = exactTaoAmountToRao(cryptoAmount)
  if (amountRao === null || amountRao !== value.crypto.amountRao ||
      fiatAmountMicros(fiatAmount) !== BigInt(value.paidMicros as string)) return null

  return Object.freeze({
    orderId: value.orderId,
    orderNo: value.orderNo,
    productId: value.productId,
    paidMicros: value.paidMicros,
    creditedMicros: value.creditedMicros,
    network: 'bittensor_mainnet',
    recipientAddress: value.recipientAddress,
    senderAddress: value.senderAddress,
    fiat: Object.freeze({ currency: 'USD' as const, amount: fiatAmount }),
    crypto: Object.freeze({ currency: 'TAO' as const, amount: cryptoAmount, amountRao }),
    quoteExpiresAt: value.quoteExpiresAt,
    autoRenew: false,
  })
}

export function taoManualTransferInstructions(
  checkout: BillingTaoCheckout,
  expectedProduct?: BillingTopupProduct,
  expectedSenderAddress?: string,
): TaoManualTransferInstructions | null {
  const amountRao = exactTaoAmountToRao(checkout.crypto.amount)
  if (amountRao === null || amountRao !== checkout.crypto.amountRao ||
      (expectedSenderAddress !== undefined && checkout.senderAddress !== expectedSenderAddress) ||
      (expectedProduct !== undefined && (checkout.productId !== expectedProduct.id ||
        checkout.paidMicros !== expectedProduct.paidMicros || checkout.creditedMicros !== expectedProduct.creditedMicros ||
        checkout.fiat.amount !== expectedProduct.displayAmount || !expectedProduct.paymentMethods.tao))) {
    return null
  }
  return Object.freeze({
    phase: 'awaiting_transfer',
    paymentMethod: 'manual_transfer',
    orderId: checkout.orderId,
    orderNo: checkout.orderNo,
    productId: checkout.productId,
    paidMicros: checkout.paidMicros,
    creditedMicros: checkout.creditedMicros,
    network: 'bittensor_mainnet',
    networkLabel: 'Bittensor Mainnet',
    recipientAddress: checkout.recipientAddress,
    senderAddress: checkout.senderAddress,
    fiatAmountUSD: checkout.fiat.amount,
    amountTao: checkout.crypto.amount,
    amountRao,
    quoteExpiresAt: checkout.quoteExpiresAt,
    autoRenew: false,
    qrPayload: checkout.recipientAddress,
    copy: Object.freeze({
      recipientAddress: checkout.recipientAddress,
      amountTao: checkout.crypto.amount,
      amountRao,
      orderNo: checkout.orderNo,
    }),
    notices: taoManualTransferNotices,
    transactionReferenceSubmission: 'available',
  })
}

type TaoManualCheckoutControllerOptions = Readonly<{
  now?: () => number
  newIdempotencyKey?: () => string
}>

type TaoManualCheckoutAttempt = Readonly<{
  product: BillingTopupProduct
  walletAddress: string
  idempotencyKey: string
  version: number
}>

function defaultIdempotencyKey() {
  return `billing-tao-manual-${crypto.randomUUID()}`
}

function idempotencyKeyValid(value: string) {
  return value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)
}

function canonicalManualSender(value: string): string {
  if (typeof value !== 'string') throw new TaoManualCheckoutError('manual_sender_invalid')
  try {
    return canonicalizeBittensorInjectedAddress(value.trim())
  } catch {
    throw new TaoManualCheckoutError('manual_sender_invalid')
  }
}

export class TaoManualCheckoutController {
  readonly #requester: TaoManualCheckoutRequester
  readonly #now: () => number
  readonly #newIdempotencyKey: () => string
  #attempt?: TaoManualCheckoutAttempt
  #activeRequest?: AbortController
  #requestGeneration = 0

  constructor(requester: TaoManualCheckoutRequester, options: TaoManualCheckoutControllerOptions = {}) {
    if (typeof requester !== 'function') throw new TypeError('A TAO Checkout requester is required.')
    this.#requester = requester
    this.#now = options.now ?? Date.now
    this.#newIdempotencyKey = options.newIdempotencyKey ?? defaultIdempotencyKey
  }

  async prepare(
    product: BillingTopupProduct,
    walletAddress: string,
    startNewAttempt = false,
  ): Promise<TaoManualCheckoutResult> {
    if (!billingTopupProductIDValid(product.id) || product.currency !== 'USD' || !product.paymentMethods.tao ||
        !billingCreditMicrosValid(product.paidMicros) || BigInt(product.paidMicros) <= 0n ||
        !billingCreditMicrosValid(product.creditedMicros) || BigInt(product.creditedMicros) <= 0n ||
        product.paidMicros !== product.creditedMicros ||
        (product.customAmount.enabled &&
          (BigInt(product.paidMicros) < BigInt(product.customAmount.minMicros) ||
            BigInt(product.paidMicros) > BigInt(product.customAmount.maxMicros) ||
            BigInt(product.paidMicros) % 10_000n !== 0n))) {
      throw new TaoManualCheckoutError('manual_checkout_response_invalid')
    }
    const canonicalSender = canonicalManualSender(walletAddress)
    let attempt = this.#attempt
    if (attempt === undefined || startNewAttempt || attempt.product.id !== product.id ||
        attempt.product.paidMicros !== product.paidMicros || attempt.product.creditedMicros !== product.creditedMicros ||
        attempt.walletAddress !== canonicalSender) {
      let idempotencyKey: string
      try {
        idempotencyKey = this.#newIdempotencyKey()
      } catch {
        throw new TaoManualCheckoutError('manual_checkout_response_invalid')
      }
      if (typeof idempotencyKey !== 'string' || !idempotencyKeyValid(idempotencyKey)) {
        throw new TaoManualCheckoutError('manual_checkout_response_invalid')
      }
      attempt = Object.freeze({
        product,
        walletAddress: canonicalSender,
        idempotencyKey,
        version: (this.#attempt?.version ?? 0) + 1,
      })
      this.#attempt = attempt
    }
    return this.#execute(attempt)
  }

  retry(): Promise<TaoManualCheckoutResult> {
    if (this.#attempt === undefined) {
      return Promise.reject(new TaoManualCheckoutError('manual_checkout_response_invalid'))
    }
    return this.#execute(this.#attempt)
  }

  abort(): void {
    this.#requestGeneration += 1
    this.#activeRequest?.abort()
    this.#activeRequest = undefined
  }

  reset(): void {
    this.abort()
    this.#attempt = undefined
  }

  currentAttempt(): Readonly<{ productId: string; walletAddress: string; version: number }> | undefined {
    const attempt = this.#attempt
    if (attempt === undefined) return undefined
    return Object.freeze({ productId: attempt.product.id, walletAddress: attempt.walletAddress, version: attempt.version })
  }

  async #execute(attempt: TaoManualCheckoutAttempt): Promise<TaoManualCheckoutResult> {
    this.#activeRequest?.abort()
    const controller = new AbortController()
    this.#activeRequest = controller
    const generation = this.#requestGeneration + 1
    this.#requestGeneration = generation
    try {
      const payload = await this.#requester(Object.freeze({
        productId: attempt.product.id,
        ...(attempt.product.customAmount.enabled ? { amountMicros: attempt.product.paidMicros } : {}),
        walletAddress: attempt.walletAddress,
        idempotencyKey: attempt.idempotencyKey,
        signal: controller.signal,
      }))
      if (controller.signal.aborted || generation !== this.#requestGeneration) {
        throw new TaoManualCheckoutError('manual_checkout_aborted')
      }
      const checkout = parseBillingTaoCheckout(payload)
      const instructions = checkout === null ? null : taoManualTransferInstructions(checkout, attempt.product, attempt.walletAddress)
      if (checkout === null || instructions === null) {
        throw new TaoManualCheckoutError('manual_checkout_response_invalid')
      }
      const observedAt = this.#now()
      if (!Number.isFinite(observedAt) || Date.parse(checkout.quoteExpiresAt) <= observedAt) {
        throw new TaoManualCheckoutError('manual_quote_expired')
      }
      return Object.freeze({ attemptVersion: attempt.version, instructions })
    } catch (error) {
      if (controller.signal.aborted || generation !== this.#requestGeneration) {
        throw new TaoManualCheckoutError('manual_checkout_aborted')
      }
      throw error
    } finally {
      if (this.#activeRequest === controller) this.#activeRequest = undefined
    }
  }
}
