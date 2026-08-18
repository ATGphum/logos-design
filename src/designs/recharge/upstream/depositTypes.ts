export type CryptoDepositAddressFormat = 'ss58' | 'evm_hex'

export type CryptoDepositAvailabilityReason =
  | 'policy_restricted'
  | 'allocation_unavailable'
  | 'processing_degraded'
  | 'maintenance'

export type CryptoDepositWarningCode =
  | 'correct_network_only'
  | 'supported_native_asset_only'
  | 'irreversible_transfer'
  | 'settled_at_processing_rate'
  | 'test_small_amount_first'

export type CryptoDepositActivityStatus =
  | 'detected'
  | 'pending_price'
  | 'credited'
  | 'below_minimum'
  | 'manual_review'
  | 'refunded'

export type CryptoDepositAsset = Readonly<{
  assetId: string
  displayName: string
  symbol: string
  decimals: number
  native: true
  minimumAtomic: string
  isDefault: boolean
  estimatedArrivalMinutes: Readonly<{
    minimum: number
    maximum: number
  }>
  warningCodes: readonly CryptoDepositWarningCode[]
}>

export type CryptoDepositNetwork = Readonly<{
  networkId: string
  displayName: string
  addressFormat: CryptoDepositAddressFormat
  explorerOrigin: string
  isDefault: boolean
  availability: Readonly<{
    canReadAddress: boolean
    canAllocateAddress: boolean
    acceptingDeposits: boolean
    reasonCode: CryptoDepositAvailabilityReason | null
  }>
  assets: readonly CryptoDepositAsset[]
}>

export type CryptoDepositCatalog = Readonly<{
  schemaVersion: 'crypto-deposit-catalog-v1'
  networks: readonly CryptoDepositNetwork[]
}>

export type CryptoDepositAddress = Readonly<{
  schemaVersion: 'crypto-deposit-address-v1'
  networkId: string
  addressFormat: CryptoDepositAddressFormat
  address: string
  addressVersion: number
  status: 'active'
  qrPayload: string
  explorerUrl: string
  allocatedAt: string
}>

export type CryptoDepositActivityItem = Readonly<{
  depositId: string
  networkId: string
  networkName: string
  assetId: string | null
  assetSymbol: string | null
  assetDecimals: number | null
  status: CryptoDepositActivityStatus
  atomicAmount: string
  minimumAtomic: string | null
  detectedAt: string
  finalizedAt: string | null
  updatedAt: string
  creditedMicros: string | null
  creditedAt: string | null
  ledgerEntryId: string | null
  refundEntryId: string | null
  refundedAt: string | null
  transactionUrl: string
}>

export type CryptoDepositActivity = Readonly<{
  schemaVersion: 'crypto-deposit-activity-v1'
  items: readonly CryptoDepositActivityItem[]
}>

export type CryptoDepositFixture = Readonly<{
  catalog: CryptoDepositCatalog
  loadAddress: (networkId: string, options: Readonly<{ signal: AbortSignal }>) => Promise<CryptoDepositAddress>
}>

type UnknownRecord = Record<string, unknown>

const networkIDPattern = /^[a-z][a-z0-9_]{2,63}$/
const symbolPattern = /^[A-Z0-9]{1,16}$/
const depositIDPattern = /^bdev_[0-9]{6,20}$/
const ledgerIDPattern = /^tok_[-A-Za-z0-9._:]{1,124}$/
const ss58SurfacePattern = /^[1-9A-HJ-NP-Za-km-z]{3,64}$/
const evmSurfacePattern = /^0x[0-9A-Fa-f]{40}$/
const utcTimestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?Z$/
const exactWarningCodes = Object.freeze<CryptoDepositWarningCode[]>([
  'correct_network_only',
  'supported_native_asset_only',
  'irreversible_transfer',
  'settled_at_processing_rate',
  'test_small_amount_first',
])
const availabilityReasons = new Set<CryptoDepositAvailabilityReason>([
  'policy_restricted',
  'allocation_unavailable',
  'processing_degraded',
  'maintenance',
])
const activityStatuses = new Set<CryptoDepositActivityStatus>([
  'detected',
  'pending_price',
  'credited',
  'below_minimum',
  'manual_review',
  'refunded',
])

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value: UnknownRecord, keys: readonly string[]) {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function containsUnsafeText(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) || codePoint === 0x61c ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
      codePoint === 0x200e || codePoint === 0x200f || (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069)
  })
}

function safeText(value: unknown, maximumBytes: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value &&
    new TextEncoder().encode(value).length <= maximumBytes && !containsUnsafeText(value)
}

function canonicalPositiveInteger(value: unknown, maximumDigits: number): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= maximumDigits && /^[1-9][0-9]*$/.test(value)
}

function validNetworkID(value: unknown): value is string {
  return typeof value === 'string' && networkIDPattern.test(value)
}

function validAssetID(value: unknown, networkID: string): value is string {
  if (typeof value !== 'string' || value.length > 64 || !value.startsWith(`${networkID}_`)) return false
  const suffix = value.slice(networkID.length + 1)
  const match = /^([a-z][a-z0-9_]{1,31})_v([1-9][0-9]{0,9})$/.exec(suffix)
  return match !== null && BigInt(match[2]) <= 4_294_967_295n
}

function validOrigin(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && parsed.username === '' && parsed.password === '' &&
      parsed.origin === value && parsed.pathname === '/' && parsed.search === '' && parsed.hash === ''
  } catch {
    return false
  }
}

function validExplorerURL(value: unknown, expectedOrigin?: string): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && parsed.username === '' && parsed.password === '' &&
      parsed.search === '' && parsed.hash === '' && parsed.pathname !== '/' &&
      (expectedOrigin === undefined || parsed.origin === expectedOrigin)
  } catch {
    return false
  }
}

function validTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false
  const match = utcTimestampPattern.exec(value)
  if (match === null || !Number.isFinite(Date.parse(value))) return false
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const maximumDay = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= maximumDay &&
    hour <= 23 && minute <= 59 && second <= 59
}

function parseCatalogAsset(value: unknown, networkID: string): CryptoDepositAsset | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'assetId', 'displayName', 'symbol', 'decimals', 'native', 'minimumAtomic', 'isDefault',
    'estimatedArrivalMinutes', 'warningCodes',
  ]) || !validAssetID(value.assetId, networkID) || !safeText(value.displayName, 80) ||
      typeof value.symbol !== 'string' || !symbolPattern.test(value.symbol) ||
      !Number.isSafeInteger(value.decimals) || (value.decimals as number) < 0 || (value.decimals as number) > 30 ||
      value.native !== true || !canonicalPositiveInteger(value.minimumAtomic, 78) ||
      typeof value.isDefault !== 'boolean' || !isRecord(value.estimatedArrivalMinutes) ||
      !hasExactKeys(value.estimatedArrivalMinutes, ['minimum', 'maximum']) ||
      !Number.isSafeInteger(value.estimatedArrivalMinutes.minimum) || !Number.isSafeInteger(value.estimatedArrivalMinutes.maximum) ||
      (value.estimatedArrivalMinutes.minimum as number) < 1 || (value.estimatedArrivalMinutes.maximum as number) > 1440 ||
      (value.estimatedArrivalMinutes.minimum as number) > (value.estimatedArrivalMinutes.maximum as number) ||
      !Array.isArray(value.warningCodes) || value.warningCodes.length !== exactWarningCodes.length ||
      !value.warningCodes.every((code, index) => code === exactWarningCodes[index])) return null

  return Object.freeze({
    assetId: value.assetId,
    displayName: value.displayName,
    symbol: value.symbol,
    decimals: value.decimals as number,
    native: true,
    minimumAtomic: value.minimumAtomic,
    isDefault: value.isDefault,
    estimatedArrivalMinutes: Object.freeze({
      minimum: value.estimatedArrivalMinutes.minimum as number,
      maximum: value.estimatedArrivalMinutes.maximum as number,
    }),
    warningCodes: Object.freeze([...exactWarningCodes]),
  })
}

function parseCatalogNetwork(value: unknown): CryptoDepositNetwork | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'networkId', 'displayName', 'addressFormat', 'explorerOrigin', 'isDefault', 'availability', 'assets',
  ]) || !validNetworkID(value.networkId) || !safeText(value.displayName, 80) ||
      (value.addressFormat !== 'ss58' && value.addressFormat !== 'evm_hex') || !validOrigin(value.explorerOrigin) ||
      typeof value.isDefault !== 'boolean' || !isRecord(value.availability) ||
      !hasExactKeys(value.availability, ['canReadAddress', 'canAllocateAddress', 'acceptingDeposits', 'reasonCode']) ||
      typeof value.availability.canReadAddress !== 'boolean' || typeof value.availability.canAllocateAddress !== 'boolean' ||
      typeof value.availability.acceptingDeposits !== 'boolean' ||
      (value.availability.reasonCode !== null &&
        (typeof value.availability.reasonCode !== 'string' || !availabilityReasons.has(value.availability.reasonCode as CryptoDepositAvailabilityReason))) ||
      value.availability.canAllocateAddress && !value.availability.canReadAddress ||
      value.availability.acceptingDeposits && !value.availability.canReadAddress ||
      value.availability.reasonCode === null &&
        (!value.availability.canReadAddress || !value.availability.canAllocateAddress || !value.availability.acceptingDeposits) ||
      !Array.isArray(value.assets) || value.assets.length < 1 || value.assets.length > 32) return null

  const assets: CryptoDepositAsset[] = []
  const assetIDs = new Set<string>()
  const symbols = new Set<string>()
  for (const candidate of value.assets) {
    const asset = parseCatalogAsset(candidate, value.networkId)
    if (asset === null || assetIDs.has(asset.assetId) || symbols.has(asset.symbol)) return null
    assetIDs.add(asset.assetId)
    symbols.add(asset.symbol)
    assets.push(asset)
  }
  if (assets.filter((asset) => asset.isDefault).length !== 1) return null

  return Object.freeze({
    networkId: value.networkId,
    displayName: value.displayName,
    addressFormat: value.addressFormat,
    explorerOrigin: value.explorerOrigin,
    isDefault: value.isDefault,
    availability: Object.freeze({
      canReadAddress: value.availability.canReadAddress,
      canAllocateAddress: value.availability.canAllocateAddress,
      acceptingDeposits: value.availability.acceptingDeposits,
      reasonCode: value.availability.reasonCode as CryptoDepositAvailabilityReason | null,
    }),
    assets: Object.freeze(assets),
  })
}

export function parseCryptoDepositCatalog(value: unknown): CryptoDepositCatalog | null {
  if (!isRecord(value) || !hasExactKeys(value, ['schemaVersion', 'networks']) ||
      value.schemaVersion !== 'crypto-deposit-catalog-v1' || !Array.isArray(value.networks) || value.networks.length > 32) return null
  const networks: CryptoDepositNetwork[] = []
  const networkIDs = new Set<string>()
  const assetIDs = new Set<string>()
  for (const candidate of value.networks) {
    const network = parseCatalogNetwork(candidate)
    if (network === null || networkIDs.has(network.networkId)) return null
    networkIDs.add(network.networkId)
    for (const asset of network.assets) {
      if (assetIDs.has(asset.assetId)) return null
      assetIDs.add(asset.assetId)
    }
    networks.push(network)
  }
  if (networks.length > 0 && networks.filter((network) => network.isDefault).length !== 1) return null
  return Object.freeze({ schemaVersion: 'crypto-deposit-catalog-v1', networks: Object.freeze(networks) })
}

function addressSurfaceValid(address: string, format: CryptoDepositAddressFormat) {
  return format === 'ss58' ? ss58SurfacePattern.test(address) : evmSurfacePattern.test(address)
}

export function parseCryptoDepositAddress(
  value: unknown,
  network: CryptoDepositNetwork,
): CryptoDepositAddress | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion', 'networkId', 'addressFormat', 'address', 'addressVersion', 'status', 'qrPayload',
    'explorerUrl', 'allocatedAt',
  ]) || value.schemaVersion !== 'crypto-deposit-address-v1' || value.networkId !== network.networkId ||
      value.addressFormat !== network.addressFormat || !safeText(value.address, 128) ||
      !addressSurfaceValid(value.address, network.addressFormat) || !Number.isSafeInteger(value.addressVersion) ||
      (value.addressVersion as number) < 1 || (value.addressVersion as number) > 4_294_967_295 ||
      value.status !== 'active' || value.qrPayload !== value.address ||
      !validExplorerURL(value.explorerUrl, network.explorerOrigin) || !validTimestamp(value.allocatedAt)) return null
  return Object.freeze({
    schemaVersion: 'crypto-deposit-address-v1',
    networkId: network.networkId,
    addressFormat: network.addressFormat,
    address: value.address,
    addressVersion: value.addressVersion as number,
    status: 'active',
    qrPayload: value.address,
    explorerUrl: value.explorerUrl,
    allocatedAt: value.allocatedAt,
  })
}

function nullableTimestamp(value: unknown): value is string | null {
  return value === null || validTimestamp(value)
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function parseActivityItem(value: unknown, catalog: CryptoDepositCatalog | null): CryptoDepositActivityItem | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'depositId', 'networkId', 'networkName', 'assetId', 'assetSymbol', 'assetDecimals', 'status',
    'atomicAmount', 'minimumAtomic', 'detectedAt', 'finalizedAt', 'updatedAt', 'creditedMicros',
    'creditedAt', 'ledgerEntryId', 'refundEntryId', 'refundedAt', 'transactionUrl',
  ]) || typeof value.depositId !== 'string' || !depositIDPattern.test(value.depositId) ||
      !validNetworkID(value.networkId) || !safeText(value.networkName, 80) ||
      typeof value.status !== 'string' || !activityStatuses.has(value.status as CryptoDepositActivityStatus) ||
      !canonicalPositiveInteger(value.atomicAmount, 78) ||
      !validTimestamp(value.detectedAt) || !nullableTimestamp(value.finalizedAt) || !validTimestamp(value.updatedAt) ||
      !nullableString(value.creditedMicros) || !nullableTimestamp(value.creditedAt) || !nullableString(value.ledgerEntryId) ||
      !nullableString(value.refundEntryId) || !nullableTimestamp(value.refundedAt)) return null

  const status = value.status as CryptoDepositActivityStatus
  const knownAsset = validAssetID(value.assetId, value.networkId) && typeof value.assetSymbol === 'string' &&
    symbolPattern.test(value.assetSymbol) && Number.isSafeInteger(value.assetDecimals) &&
    (value.assetDecimals as number) >= 0 && (value.assetDecimals as number) <= 30 &&
    canonicalPositiveInteger(value.minimumAtomic, 78)
  const unsupportedAsset = status === 'manual_review' && value.assetId === null && value.assetSymbol === null &&
    value.assetDecimals === null && value.minimumAtomic === null
  if (!knownAsset && !unsupportedAsset) return null
  const detectedAt = Date.parse(value.detectedAt)
  const finalizedAt = value.finalizedAt === null ? null : Date.parse(value.finalizedAt)
  const updatedAt = Date.parse(value.updatedAt)
  if (updatedAt < detectedAt || finalizedAt !== null && finalizedAt > detectedAt ||
      ['pending_price', 'below_minimum', 'credited', 'refunded'].includes(status) && finalizedAt === null ||
      status === 'below_minimum' && (!knownAsset || typeof value.minimumAtomic !== 'string' ||
        BigInt(value.atomicAmount) >= BigInt(value.minimumAtomic))) return null

  const catalogNetwork = catalog?.networks.find((network) => network.networkId === value.networkId)
  if (!validExplorerURL(value.transactionUrl, catalogNetwork?.explorerOrigin)) return null

  const hasCredit = value.creditedMicros !== null || value.creditedAt !== null || value.ledgerEntryId !== null
  const hasRefund = value.refundEntryId !== null || value.refundedAt !== null
  if (status !== 'credited' && status !== 'refunded') {
    if (hasCredit || hasRefund) return null
  } else {
    if (!canonicalPositiveInteger(value.creditedMicros, 19) || BigInt(value.creditedMicros) > 9_223_372_036_854_775_807n ||
        !validTimestamp(value.creditedAt) || typeof value.ledgerEntryId !== 'string' || !ledgerIDPattern.test(value.ledgerEntryId) ||
        finalizedAt === null) return null
    const creditedAt = Date.parse(value.creditedAt)
    if (creditedAt < detectedAt || creditedAt < finalizedAt || creditedAt > updatedAt) return null
    if (status === 'credited') {
      if (hasRefund) return null
    } else {
      if (typeof value.refundEntryId !== 'string' || !ledgerIDPattern.test(value.refundEntryId) ||
          value.refundEntryId === value.ledgerEntryId || !validTimestamp(value.refundedAt)) return null
      const refundedAt = Date.parse(value.refundedAt)
      if (refundedAt < creditedAt || refundedAt > updatedAt) return null
    }
  }

  return Object.freeze({
    depositId: value.depositId,
    networkId: value.networkId,
    networkName: value.networkName,
    assetId: value.assetId as string | null,
    assetSymbol: value.assetSymbol as string | null,
    assetDecimals: value.assetDecimals as number | null,
    status,
    atomicAmount: value.atomicAmount,
    minimumAtomic: value.minimumAtomic as string | null,
    detectedAt: value.detectedAt,
    finalizedAt: value.finalizedAt,
    updatedAt: value.updatedAt,
    creditedMicros: value.creditedMicros,
    creditedAt: value.creditedAt,
    ledgerEntryId: value.ledgerEntryId,
    refundEntryId: value.refundEntryId,
    refundedAt: value.refundedAt,
    transactionUrl: value.transactionUrl,
  })
}

export function parseCryptoDepositActivity(
  value: unknown,
  catalog: CryptoDepositCatalog | null = null,
): CryptoDepositActivity | null {
  if (!isRecord(value) || !hasExactKeys(value, ['schemaVersion', 'items']) ||
      value.schemaVersion !== 'crypto-deposit-activity-v1' || !Array.isArray(value.items) || value.items.length > 100) return null
  const items: CryptoDepositActivityItem[] = []
  const depositIDs = new Set<string>()
  const ledgerIDs = new Set<string>()
  for (const candidate of value.items) {
    const item = parseActivityItem(candidate, catalog)
    if (item === null || depositIDs.has(item.depositId)) return null
    depositIDs.add(item.depositId)
    for (const ledgerID of [item.ledgerEntryId, item.refundEntryId]) {
      if (ledgerID === null) continue
      if (ledgerIDs.has(ledgerID)) return null
      ledgerIDs.add(ledgerID)
    }
    const previous = items.at(-1)
    if (previous !== undefined && (Date.parse(previous.detectedAt) < Date.parse(item.detectedAt) ||
        previous.detectedAt === item.detectedAt && previous.depositId < item.depositId)) return null
    items.push(item)
  }
  return Object.freeze({ schemaVersion: 'crypto-deposit-activity-v1', items: Object.freeze(items) })
}

export function formatAtomicAssetAmount(atomicAmount: string, decimals: number) {
  if (decimals === 0) return atomicAmount
  const padded = atomicAmount.padStart(decimals + 1, '0')
  const whole = padded.slice(0, -decimals)
  const fraction = padded.slice(-decimals).replace(/0+$/, '')
  return fraction === '' ? whole : `${whole}.${fraction}`
}
