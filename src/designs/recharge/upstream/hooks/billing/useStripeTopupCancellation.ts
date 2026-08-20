import { useCallback, useRef } from 'react'
import { api } from '../../api'
import { parseBillingTopupOrderStatus, type BillingTopupOrderStatus } from '../../topupTypes'
import { pageText } from '../../i18n/pageText'

const topupCancellationAttemptStoragePrefix = 'logos.billing.topupCancellation.'

function topupCancellationAttemptKey(orderID: string, attempts: Map<string, string>) {
  const current = attempts.get(orderID)
  if (current) return current
  const storageKey = `${topupCancellationAttemptStoragePrefix}${orderID}`
  try {
    const stored = window.sessionStorage.getItem(storageKey)
    if (stored && /^billing-topup-cancel-[0-9a-f-]{36}$/.test(stored)) {
      attempts.set(orderID, stored)
      return stored
    }
    if (stored) window.sessionStorage.removeItem(storageKey)
  } catch {
    // Storage can be unavailable; the in-memory map still protects retries in this page.
  }
  const created = `billing-topup-cancel-${crypto.randomUUID()}`
  attempts.set(orderID, created)
  try {
    window.sessionStorage.setItem(storageKey, created)
  } catch {
    // See the read path above.
  }
  return created
}

function completeTopupCancellationAttempt(orderID: string, attempts: Map<string, string>) {
  attempts.delete(orderID)
  try {
    window.sessionStorage.removeItem(`${topupCancellationAttemptStoragePrefix}${orderID}`)
  } catch {
    // Completion is already reflected in memory.
  }
}

export function useStripeTopupCancellation() {
  const attempts = useRef(new Map<string, string>())
  return useCallback(async (orderID: string): Promise<BillingTopupOrderStatus> => {
    if (!/^bord_[A-Za-z0-9_-]+$/.test(orderID)) throw new Error(pageText('dynamic.billing.cancelRechargeFailed'))
    const idempotencyKey = topupCancellationAttemptKey(orderID, attempts.current)
    const response = await api<unknown>(`/billing/orders/${encodeURIComponent(orderID)}/cancel`, {
      method: 'POST',
      body: { mode: 'cancel' },
      idempotencyKey,
    })
    const parsed = parseBillingTopupOrderStatus(response)
    if (parsed === null || parsed.id !== orderID || !['canceled', 'expired', 'failed'].includes(parsed.status)) {
      throw new Error(pageText('dynamic.billing.cancelRechargeFailed'))
    }
    completeTopupCancellationAttempt(orderID, attempts.current)
    return parsed
  }, [])
}
