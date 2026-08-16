export const taoWalletSources = Object.freeze(['talisman', 'subwallet-js', 'polkadot-js'] as const)

export type TaoWalletSource = (typeof taoWalletSources)[number]

export const taoAccountTypes = Object.freeze(['sr25519', 'ed25519'] as const)

export type TaoAccountType = (typeof taoAccountTypes)[number]

export type ConnectedTaoWallet = Readonly<{
  source: TaoWalletSource
  address: string
  accountName?: string
  accountType: TaoAccountType
}>

export type TaoTransferRequest = Readonly<{
  orderId: string
  network: 'bittensor_mainnet'
  genesisHash: string
  senderAddress: string
  recipientAddress: string
  amountRao: string
  quoteExpiresAt: string
}>

export type TaoTransferSubmission = Readonly<{
  extrinsicHash: `0x${string}`
}>

export interface TaoWalletAdapter {
  availability(): Readonly<Record<TaoWalletSource, boolean>>
  connect(source: TaoWalletSource): Promise<ConnectedTaoWallet>
  subscribeAccounts(onChange: (accounts: ConnectedTaoWallet[]) => void): () => void
  disconnect(): Promise<void>
  transfer(input: TaoTransferRequest): Promise<TaoTransferSubmission>
}

export const taoWalletErrorCodes = Object.freeze([
  'wallet_not_installed',
  'wallet_permission_denied',
  'wallet_no_accounts',
  'wallet_account_unsupported',
  'wallet_user_rejected',
  'wallet_account_changed',
  'wallet_insufficient_balance',
  'wallet_rpc_unavailable',
  'wallet_runtime_mismatch',
  'wallet_submission_failed',
  'wallet_unknown_error',
] as const)

export type TaoWalletErrorCode = (typeof taoWalletErrorCodes)[number]

const taoWalletErrorMessages: Readonly<Record<TaoWalletErrorCode, string>> = Object.freeze({
  wallet_not_installed: 'The selected wallet is not installed.',
  wallet_permission_denied: 'Wallet access was not granted.',
  wallet_no_accounts: 'The selected wallet has no available accounts.',
  wallet_account_unsupported: 'The selected wallet account is not supported.',
  wallet_user_rejected: 'The wallet request was canceled.',
  wallet_account_changed: 'The wallet account changed. Create a new payment attempt.',
  wallet_insufficient_balance: 'The wallet balance cannot cover the payment and network fee.',
  wallet_rpc_unavailable: 'The Bittensor network is temporarily unavailable.',
  wallet_runtime_mismatch: 'The Bittensor runtime is not compatible with wallet payment.',
  wallet_submission_failed: 'The wallet could not submit the transfer.',
  wallet_unknown_error: 'The wallet request could not be completed.',
})

export class TaoWalletError extends Error {
  readonly code: TaoWalletErrorCode
  readonly source?: TaoWalletSource

  constructor(code: TaoWalletErrorCode, source?: TaoWalletSource) {
    super(taoWalletErrorMessages[code])
    this.name = 'TaoWalletError'
    this.code = code
    if (source !== undefined) this.source = source
  }
}

export function taoWalletSourceValid(value: unknown): value is TaoWalletSource {
  return typeof value === 'string' && taoWalletSources.some((source) => source === value)
}

export function taoAccountTypeValid(value: unknown): value is TaoAccountType {
  return typeof value === 'string' && taoAccountTypes.some((accountType) => accountType === value)
}

export function taoWalletErrorCodeValid(value: unknown): value is TaoWalletErrorCode {
  return typeof value === 'string' && taoWalletErrorCodes.some((code) => code === value)
}

export function asTaoWalletError(error: unknown, source?: TaoWalletSource): TaoWalletError {
  if (error instanceof TaoWalletError) return error
  return new TaoWalletError('wallet_unknown_error', source)
}

export const taoWalletPhases = Object.freeze([
  'idle',
  'selecting_wallet',
  'connecting',
  'selecting_account',
  'ready',
  'quote_created',
  'preflight',
  'awaiting_wallet_approval',
  'submitted',
  'server_verifying',
  'confirmed',
  'manual_review',
  'failed',
] as const)

export type TaoWalletPhase = (typeof taoWalletPhases)[number]

export function taoWalletPhaseValid(value: unknown): value is TaoWalletPhase {
  return typeof value === 'string' && taoWalletPhases.some((phase) => phase === value)
}

const taoWalletTransitions = Object.freeze({
  idle: ['selecting_wallet'],
  selecting_wallet: ['connecting', 'idle'],
  connecting: ['selecting_account', 'selecting_wallet', 'failed', 'idle'],
  selecting_account: ['ready', 'selecting_wallet', 'failed', 'idle'],
  ready: ['quote_created', 'selecting_account', 'selecting_wallet', 'idle'],
  quote_created: ['preflight', 'selecting_account', 'failed', 'idle'],
  preflight: ['awaiting_wallet_approval', 'selecting_account', 'failed', 'idle'],
  awaiting_wallet_approval: ['submitted', 'quote_created', 'selecting_account', 'failed', 'idle'],
  submitted: ['server_verifying', 'failed'],
  server_verifying: ['confirmed', 'manual_review', 'failed'],
  confirmed: ['idle'],
  manual_review: ['idle'],
  failed: ['selecting_wallet', 'idle'],
} as const satisfies Readonly<Record<TaoWalletPhase, readonly TaoWalletPhase[]>>)

export function taoWalletTransitionAllowed(from: TaoWalletPhase, to: TaoWalletPhase): boolean {
  return taoWalletPhaseValid(from) && taoWalletPhaseValid(to) && taoWalletTransitions[from].some((candidate) => candidate === to)
}

type UnknownRecord = Record<string, unknown>

const transferRequestKeys = Object.freeze([
  'amountRao',
  'genesisHash',
  'network',
  'orderId',
  'quoteExpiresAt',
  'recipientAddress',
  'senderAddress',
] as const)

const maximumRao = (1n << 128n) - 1n

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactTransferRequestKeys(value: UnknownRecord) {
  const keys = Object.keys(value).sort()
  return keys.length === transferRequestKeys.length && keys.every((key, index) => key === transferRequestKeys[index])
}

function addressReferenceValid(value: unknown) {
  return typeof value === 'string' && value.length >= 32 && value.length <= 128 && value.trim() === value
}

function quoteExpiryValid(value: unknown, nowMilliseconds: number, minimumRemainingMilliseconds: number) {
  if (typeof value !== 'string' || value.length > 64 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value)) return false
  const expiry = Date.parse(value)
  return Number.isFinite(expiry) && expiry >= nowMilliseconds + minimumRemainingMilliseconds
}

export function taoTransferRequestValid(
  value: unknown,
  nowMilliseconds = Date.now(),
  minimumRemainingMilliseconds = 30_000,
): value is TaoTransferRequest {
  if (!isRecord(value) || !exactTransferRequestKeys(value) || !Number.isFinite(nowMilliseconds) ||
      !Number.isFinite(minimumRemainingMilliseconds) || minimumRemainingMilliseconds < 0) return false
  if (typeof value.orderId !== 'string' || !/^bord_[A-Za-z0-9_-]{1,120}$/.test(value.orderId)) return false
  if (value.network !== 'bittensor_mainnet') return false
  if (typeof value.genesisHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value.genesisHash) || /^0x0{64}$/.test(value.genesisHash)) return false
  if (!addressReferenceValid(value.senderAddress) || !addressReferenceValid(value.recipientAddress) ||
      value.senderAddress === value.recipientAddress) return false
  if (typeof value.amountRao !== 'string' || !/^[1-9][0-9]{0,38}$/.test(value.amountRao)) return false
  try {
    if (BigInt(value.amountRao) > maximumRao) return false
  } catch {
    return false
  }
  return quoteExpiryValid(value.quoteExpiresAt, nowMilliseconds, minimumRemainingMilliseconds)
}

export function taoExtrinsicHashValid(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value)
}

export type FakeTaoWalletAccount = Readonly<{
  address: string
  accountName?: string
  accountType?: TaoAccountType | 'ecdsa'
}>

export type FakeTaoWalletAdapterOptions = Readonly<{
  availability?: Partial<Readonly<Record<TaoWalletSource, boolean>>>
  accounts?: Partial<Readonly<Record<TaoWalletSource, readonly FakeTaoWalletAccount[]>>>
  connectErrors?: Partial<Readonly<Record<TaoWalletSource, TaoWalletErrorCode>>>
  submit?: (
    input: TaoTransferRequest,
    wallet: ConnectedTaoWallet,
  ) => Promise<unknown> | unknown
  now?: () => number
}>

function copyAvailability(
  configured: FakeTaoWalletAdapterOptions['availability'],
  accounts: FakeTaoWalletAdapterOptions['accounts'],
): Readonly<Record<TaoWalletSource, boolean>> {
  return Object.freeze({
    talisman: configured?.talisman ?? accounts?.talisman !== undefined,
    'subwallet-js': configured?.['subwallet-js'] ?? accounts?.['subwallet-js'] !== undefined,
    'polkadot-js': configured?.['polkadot-js'] ?? accounts?.['polkadot-js'] !== undefined,
  })
}

function accountName(value: string | undefined) {
  if (value === undefined) return undefined
  const normalized = value.trim()
  return normalized !== '' && normalized.length <= 128 ? normalized : undefined
}

function supportedFakeAccounts(source: TaoWalletSource, candidates: readonly FakeTaoWalletAccount[]): ConnectedTaoWallet[] {
  const supported: ConnectedTaoWallet[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (!taoAccountTypeValid(candidate.accountType) || !addressReferenceValid(candidate.address) || seen.has(candidate.address)) continue
    seen.add(candidate.address)
    const name = accountName(candidate.accountName)
    const wallet: ConnectedTaoWallet = name === undefined
      ? { source, address: candidate.address, accountType: candidate.accountType }
      : { source, address: candidate.address, accountName: name, accountType: candidate.accountType }
    supported.push(Object.freeze(wallet))
  }
  return supported
}

function copyFakeAccounts(
  accounts: FakeTaoWalletAdapterOptions['accounts'],
): Record<TaoWalletSource, readonly FakeTaoWalletAccount[]> {
  return {
    talisman: [...(accounts?.talisman ?? [])],
    'subwallet-js': [...(accounts?.['subwallet-js'] ?? [])],
    'polkadot-js': [...(accounts?.['polkadot-js'] ?? [])],
  }
}

const defaultFakeExtrinsicHash = `0x${'11'.repeat(32)}` as const

// FakeTaoWalletAdapter is deterministic test infrastructure. It never detects
// or enables a browser extension and must not be used as a production connector.
export class FakeTaoWalletAdapter implements TaoWalletAdapter {
  readonly #available: Readonly<Record<TaoWalletSource, boolean>>
  readonly #connectErrors: FakeTaoWalletAdapterOptions['connectErrors']
  readonly #submit: NonNullable<FakeTaoWalletAdapterOptions['submit']>
  readonly #now: () => number
  readonly #connectCounts: Record<TaoWalletSource, number> = {
    talisman: 0,
    'subwallet-js': 0,
    'polkadot-js': 0,
  }
  readonly #subscribers = new Set<(accounts: ConnectedTaoWallet[]) => void>()
  #accounts: Record<TaoWalletSource, readonly FakeTaoWalletAccount[]>
  #connected?: ConnectedTaoWallet
  #accountGeneration = 0
  #transferInFlight = false

  constructor(options: FakeTaoWalletAdapterOptions = {}) {
    this.#available = copyAvailability(options.availability, options.accounts)
    this.#accounts = copyFakeAccounts(options.accounts)
    this.#connectErrors = options.connectErrors
    this.#submit = options.submit ?? (() => ({ extrinsicHash: defaultFakeExtrinsicHash }))
    this.#now = options.now ?? Date.now
  }

  availability(): Readonly<Record<TaoWalletSource, boolean>> {
    return this.#available
  }

  async connect(source: TaoWalletSource): Promise<ConnectedTaoWallet> {
    if (!taoWalletSourceValid(source) || !this.#available[source]) {
      throw new TaoWalletError('wallet_not_installed', taoWalletSourceValid(source) ? source : undefined)
    }
    this.#connectCounts[source] += 1
    const configuredError = this.#connectErrors?.[source]
    if (configuredError !== undefined) throw new TaoWalletError(configuredError, source)

    const candidates = this.#accounts[source]
    if (candidates.length === 0) throw new TaoWalletError('wallet_no_accounts', source)
    const supported = supportedFakeAccounts(source, candidates)
    if (supported.length === 0) throw new TaoWalletError('wallet_account_unsupported', source)

    this.#connected = supported[0]
    this.#accountGeneration += 1
    return this.#connected
  }

  subscribeAccounts(onChange: (accounts: ConnectedTaoWallet[]) => void): () => void {
    if (typeof onChange !== 'function') throw new TaoWalletError('wallet_unknown_error')
    this.#subscribers.add(onChange)
    let subscribed = true
    return () => {
      if (!subscribed) return
      subscribed = false
      this.#subscribers.delete(onChange)
    }
  }

  async disconnect(): Promise<void> {
    this.#connected = undefined
    this.#accountGeneration += 1
    this.#subscribers.clear()
  }

  async transfer(input: TaoTransferRequest): Promise<TaoTransferSubmission> {
    const connected = this.#connected
    if (connected === undefined || connected.address !== input?.senderAddress) {
      throw new TaoWalletError('wallet_account_changed', connected?.source)
    }
    if (!taoTransferRequestValid(input, this.#now())) {
      throw new TaoWalletError('wallet_submission_failed', connected.source)
    }
    if (this.#transferInFlight) throw new TaoWalletError('wallet_submission_failed', connected.source)

    this.#transferInFlight = true
    const generation = this.#accountGeneration
    const immutableInput = Object.freeze({ ...input })
    try {
      const result = await this.#submit(immutableInput, connected)
      if (generation !== this.#accountGeneration || this.#connected?.address !== connected.address) {
        throw new TaoWalletError('wallet_account_changed', connected.source)
      }
      if (!isRecord(result) || Object.keys(result).length !== 1 || !taoExtrinsicHashValid(result.extrinsicHash)) {
        throw new TaoWalletError('wallet_submission_failed', connected.source)
      }
      return Object.freeze({ extrinsicHash: result.extrinsicHash })
    } catch (error) {
      throw asTaoWalletError(error, connected.source)
    } finally {
      this.#transferInFlight = false
    }
  }

  connectCount(source: TaoWalletSource): number {
    return this.#connectCounts[source]
  }

  connectedWallet(): ConnectedTaoWallet | undefined {
    return this.#connected
  }

  emitAccounts(source: TaoWalletSource, accounts: readonly FakeTaoWalletAccount[]): void {
    if (!taoWalletSourceValid(source)) return
    this.#accounts = { ...this.#accounts, [source]: [...accounts] }
    const supported = supportedFakeAccounts(source, accounts)
    if (this.#connected?.source === source) {
      const current = this.#connected
      const next = supported.find((account) => account.address === current.address) ?? supported[0]
      this.#connected = next
      if (next?.address !== current.address || next.accountType !== current.accountType) this.#accountGeneration += 1
    }
    for (const subscriber of [...this.#subscribers]) {
      try {
        subscriber([...supported])
      } catch {
        continue
      }
    }
  }
}
