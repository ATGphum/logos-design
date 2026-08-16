/**
 * DESIGN SHIM — replaces web-ui/src/api.ts (the real HTTP client).
 *
 * Serves deterministic fixture payloads for the endpoints the billing hooks
 * call, so the adopted Recharge page renders with realistic data and no
 * backend. Fixtures are crafted to satisfy the strict parsers in
 * billingTypes.ts / topupTypes.ts.
 *
 * Mutating endpoints (checkout creation) intentionally fail with a sandbox
 * message — checkout flows are simulated, not executed, in the design.
 */

export type ApiOptions = {
  method?: string
  body?: unknown
  idempotencyKey?: string
  signal?: AbortSignal
}

export type ApiErrorParameters = Readonly<Record<string, string | number>>

export class ApiError extends Error {
  code: string
  method: string
  path: string
  rawBody: string
  status: number
  requestID: string
  parameters: ApiErrorParameters

  constructor(message: string, details: Partial<Pick<ApiError, 'code' | 'method' | 'path' | 'status'>> = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = details.code ?? 'design_sandbox'
    this.method = details.method ?? 'GET'
    this.path = details.path ?? ''
    this.rawBody = ''
    this.status = details.status ?? 503
    this.requestID = 'design-fixture'
    this.parameters = Object.freeze({})
  }
}

// ---- fixtures ---------------------------------------------------------------
// Balance mirrors the production screenshot: $60.936934 (micros are exact).
const rechargeAccount = {
  customerExists: true,
  balanceMicros: '60936934',
  ledgerConfigured: true,
  topup: { allowed: true, canCreateCheckout: true, activeOrderId: null },
}

// TAO enabled with browser-wallet transfer; card (Stripe) deliberately
// unavailable — matches the live console's current recharge page.
const publicConfig = {
  stripe: {
    enabled: false,
    publishableKey: '',
    liveMode: false,
    paymentElementEnabled: false,
    expressCheckoutEnabled: false,
    customerPortalEnabled: false,
  },
  tao: {
    enabled: true,
    walletTransferEnabled: true,
    browserPublicWssUrl: 'wss://entrypoint-finney.opentensor.ai',
  },
}

const usd = (amount: number) => ({
  paidMicros: String(amount * 1_000_000),
  creditedMicros: String(amount * 1_000_000),
  displayAmount: `${amount}.00`,
})

// One custom-amount product ($1–$10,000 range, like production) plus the
// quick amounts. Parser invariants: custom-enabled ⇒ paid === min;
// custom-disabled ⇒ min === max === paid.
const topupProducts = {
  items: [
    {
      id: 'topup_custom_amount',
      code: 'topup_custom',
      name: 'Custom amount',
      currency: 'USD',
      ...usd(1),
      revision: 1,
      customAmount: { enabled: true, minMicros: '1000000', maxMicros: '10000000000' },
      paymentMethods: { tao: true, stripe: false },
    },
    ...[20, 50, 100].map((amount) => ({
      id: `topup_quick_${amount}`,
      code: `topup_q${amount}`,
      name: `$${amount} credit`,
      currency: 'USD',
      ...usd(amount),
      revision: 1,
      customAmount: {
        enabled: false,
        minMicros: String(amount * 1_000_000),
        maxMicros: String(amount * 1_000_000),
      },
      paymentMethods: { tao: true, stripe: false },
    })),
  ],
}

// Two settled TAO recharges. Every field crosses parseBillingTopupHistory's
// invariants: paid ⇒ paidAt + finalized payment evidence + credited credit.
const historyEntry = (
  n: number,
  amount: number,
  createdAt: string,
  paidAt: string,
  balanceAfter: string,
) => ({
  orderId: `bord_design_${n}`,
  orderNo: `R-2026-00${n}`,
  planId: 'topup_custom_amount',
  provider: 'tao',
  purchaseKind: 'topup',
  orderType: 'one_time',
  renewalMode: 'manual',
  amountUSD: `${amount}.00`,
  paidMicros: String(amount * 1_000_000),
  creditedMicros: String(amount * 1_000_000),
  status: 'paid',
  creditStatus: 'credited',
  createdAt,
  paidAt,
  refundStatus: 'not_refunded',
  credit: {
    ledgerEntryId: `tok_design_${n}`,
    deltaMicros: String(amount * 1_000_000),
    balanceMicros: balanceAfter,
    creditedAt: paidAt,
  },
  payments: [
    {
      paymentId: `bpay_design_${n}`,
      kind: 'tao_transaction',
      status: 'finalized',
      recordedAt: createdAt,
      finalizedAt: paidAt,
      transactionHash: `0x${String(n).repeat(4).padStart(4, '0').slice(0, 4)}${'ab'.repeat(30)}`,
      transactionURL: `https://taostats.io/extrinsic/0x${String(n).repeat(4).padStart(4, '0').slice(0, 4)}${'ab'.repeat(30)}`,
    },
  ],
})

const topupHistory = {
  items: [
    historyEntry(2, 50, '2026-08-09T04:12:00Z', '2026-08-09T04:15:41Z', '75936934'),
    historyEntry(1, 20, '2026-07-28T11:03:00Z', '2026-07-28T11:07:19Z', '25936934'),
  ],
  actions: { canViewStripeReceipts: false },
}

const fixtures: Record<string, unknown> = {
  '/billing/me': rechargeAccount,
  '/billing/config': publicConfig,
  '/billing/topup-products': topupProducts,
  '/billing/history': topupHistory,
}

// ---- api --------------------------------------------------------------------
const fixtureLatencyMs = 250

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, fixtureLatencyMs))
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const method = options.method ?? 'GET'
  if (method !== 'GET') {
    throw new ApiError('Checkout is simulated in the design sandbox — no payment is created.', {
      code: 'design_sandbox_readonly',
      method,
      path,
      status: 503,
    })
  }
  const payload = fixtures[path]
  if (payload === undefined) {
    throw new ApiError(`No design fixture for ${path}`, { code: 'design_fixture_missing', method, path, status: 404 })
  }
  return JSON.parse(JSON.stringify(payload)) as T
}

// ---- error helpers (same call signatures as the real module) ---------------
export type ApiErrorMessageDescriptor = Readonly<{ key: string; parameters: ApiErrorParameters }>

export function apiErrorMessage(error: unknown, fallback = 'The request could not be completed.'): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof DOMException && error.name === 'AbortError') return fallback
  if (error instanceof Error && error.message.length > 0) return error.message
  return fallback
}

export function apiErrorStatus(error: unknown) {
  return error instanceof ApiError ? error.status : 0
}

export function apiErrorCode(error: unknown) {
  return error instanceof ApiError ? error.code : ''
}

export function csrfTokenFromCookie() {
  return ''
}
