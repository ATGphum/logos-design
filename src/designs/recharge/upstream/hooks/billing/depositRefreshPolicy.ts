import type { CryptoDepositActivity } from '../../depositTypes'

export type CryptoDepositRefreshOptions = Readonly<{
  regularIntervalMs: number
  pendingIntervalMs: number
  pendingMaximumDurationMs: number
}>

export const cryptoDepositRefreshDefaults = Object.freeze<CryptoDepositRefreshOptions>({
  regularIntervalMs: 60_000,
  pendingIntervalMs: 5_000,
  pendingMaximumDurationMs: 10 * 60_000,
})

function boundedMilliseconds(value: number | undefined, fallback: number, maximum: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.min(maximum, Math.max(10, Math.floor(value)))
}

export function cryptoDepositRefreshOptions(
  options: Partial<CryptoDepositRefreshOptions> = {},
): CryptoDepositRefreshOptions {
  return Object.freeze({
    regularIntervalMs: boundedMilliseconds(options.regularIntervalMs, cryptoDepositRefreshDefaults.regularIntervalMs, 10 * 60_000),
    pendingIntervalMs: boundedMilliseconds(options.pendingIntervalMs, cryptoDepositRefreshDefaults.pendingIntervalMs, 60_000),
    pendingMaximumDurationMs: boundedMilliseconds(
      options.pendingMaximumDurationMs,
      cryptoDepositRefreshDefaults.pendingMaximumDurationMs,
      60 * 60_000,
    ),
  })
}

export function cryptoDepositActivityNeedsShortPolling(activity: CryptoDepositActivity) {
  return activity.items.some((item) => item.status === 'detected' || item.status === 'pending_price')
}

export function cryptoDepositNextRefreshDelay(
  needsShortPolling: boolean,
  pendingStartedAt: number | null,
  now: number,
  options: CryptoDepositRefreshOptions,
) {
  if (needsShortPolling && pendingStartedAt !== null && now - pendingStartedAt < options.pendingMaximumDurationMs) {
    return options.pendingIntervalMs
  }
  return options.regularIntervalMs
}
