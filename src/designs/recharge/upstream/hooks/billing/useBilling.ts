import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import { parseBillingCancellationResult } from '../../billingCancellation'
import {
  parseBillingAccount,
  parseBillingHistory,
  parseBillingPlans,
  parseBillingPublicConfig,
  type BillingAccount,
  type BillingHistory,
  type BillingPlan,
  type BillingPublicConfig,
} from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

type BillingDataState = {
  plans: BillingPlan[]
  config: BillingPublicConfig | null
  account: BillingAccount | null
  history: BillingHistory
  loading: boolean
  plansAvailable: boolean
  plansFresh: boolean
  configAvailable: boolean
  configFresh: boolean
  accountAvailable: boolean
  accountFresh: boolean
  historyAvailable: boolean
  historyFresh: boolean
  plansError: string
  configError: string
  accountError: string
  historyError: string
  error: string
}

const emptyBillingHistory: BillingHistory = Object.freeze({
  items: Object.freeze([]),
  actions: Object.freeze({ canViewStripeReceipts: false }),
})

const initialState: BillingDataState = {
  plans: [], config: null, account: null, history: emptyBillingHistory, loading: true,
  plansAvailable: false, plansFresh: false, configAvailable: false, configFresh: false,
  accountAvailable: false, accountFresh: false, historyAvailable: false, historyFresh: false,
  plansError: '', configError: '', accountError: '', historyError: '', error: '',
}

const cancellationAttemptStoragePrefix = 'logos.billing.cancellation.'

function cancellationAttemptKey(subscriptionID: string, attempts: Map<string, string>) {
  const current = attempts.get(subscriptionID)
  if (current) return current
  const storageKey = `${cancellationAttemptStoragePrefix}${subscriptionID}`
  try {
    const stored = window.sessionStorage.getItem(storageKey)
    if (stored && /^billing-cancel-[0-9a-f-]{36}$/.test(stored)) {
      attempts.set(subscriptionID, stored)
      return stored
    }
    if (stored) window.sessionStorage.removeItem(storageKey)
  } catch {
    // Storage may be unavailable in hardened browser contexts; the in-memory
    // registry still preserves the key for retries during this page lifetime.
  }
  const created = `billing-cancel-${crypto.randomUUID()}`
  attempts.set(subscriptionID, created)
  try {
    window.sessionStorage.setItem(storageKey, created)
  } catch {
    // See the read path above.
  }
  return created
}

function completeCancellationAttempt(subscriptionID: string, attempts: Map<string, string>) {
  attempts.delete(subscriptionID)
  try {
    window.sessionStorage.removeItem(`${cancellationAttemptStoragePrefix}${subscriptionID}`)
  } catch {
    // Completion is already reflected by the in-memory registry.
  }
}

export function useBilling() {
  const [state, setState] = useState(initialState)
  const generation = useRef(0)
  const active = useRef<AbortController | null>(null)
  const cancellationAttempts = useRef(new Map<string, string>())

  const refresh = useCallback(async () => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setState((current) => ({
      ...current,
      loading: true,
      plansFresh: false,
      configFresh: false,
      accountFresh: false,
      historyFresh: false,
      plansError: '',
      configError: '',
      accountError: '',
      historyError: '',
      error: '',
    }))
    const [plansResult, configResult, accountResult, historyResult] = await Promise.allSettled([
      api<unknown>('/billing/plans', { signal: controller.signal }),
      api<unknown>('/billing/config', { signal: controller.signal }),
      api<unknown>('/billing/me', { signal: controller.signal }),
      api<unknown>('/billing/history', { signal: controller.signal }),
    ])
    if (controller.signal.aborted || generation.current !== requestGeneration) return
    const plans = plansResult.status === 'fulfilled' ? parseBillingPlans(plansResult.value) : null
    const config = configResult.status === 'fulfilled' ? parseBillingPublicConfig(configResult.value) : null
    const account = accountResult.status === 'fulfilled' ? parseBillingAccount(accountResult.value) : null
    const history = historyResult.status === 'fulfilled' ? parseBillingHistory(historyResult.value) : null
    const plansError = plans === null
      ? apiErrorMessage(plansResult.status === 'rejected' ? plansResult.reason : new Error(pageText('dynamic.billing.plansRefreshFailed')), pageText('dynamic.billing.plansRefreshFailed'))
      : ''
    const configError = config === null
      ? apiErrorMessage(configResult.status === 'rejected' ? configResult.reason : new Error(pageText('dynamic.billing.paymentMethodsRefreshFailed')), pageText('dynamic.billing.paymentMethodsRefreshFailed'))
      : ''
    const accountError = account === null
      ? apiErrorMessage(accountResult.status === 'rejected' ? accountResult.reason : new Error(pageText('dynamic.billing.accountRefreshFailed')), pageText('dynamic.billing.accountRefreshFailed'))
      : ''
    const historyError = history === null
      ? apiErrorMessage(historyResult.status === 'rejected' ? historyResult.reason : new Error(pageText('dynamic.billing.historyRefreshFailed')), pageText('dynamic.billing.historyRefreshFailed'))
      : ''
    setState((current) => ({
      plans: plans ?? current.plans,
      config: config ?? current.config,
      account: account ?? current.account,
      history: history ?? current.history,
      loading: false,
      plansAvailable: plans !== null || current.plansAvailable,
      plansFresh: plans !== null,
      configAvailable: config !== null || current.configAvailable,
      configFresh: config !== null,
      accountAvailable: account !== null || current.accountAvailable,
      accountFresh: account !== null,
      historyAvailable: history !== null || current.historyAvailable,
      historyFresh: history !== null,
      plansError,
      configError,
      accountError,
      historyError,
      error: plansError || configError,
    }))
  }, [])

  useEffect(() => {
    void refresh()
    return () => active.current?.abort()
  }, [refresh])

  const openCustomerPortal = useCallback(async () => {
    const response = await api<unknown>('/billing/stripe/portal', { method: 'POST', body: {} })
    if (typeof response !== 'object' || response === null || Array.isArray(response) ||
        typeof (response as Record<string, unknown>).portalUrl !== 'string') {
      throw new Error(pageText('dynamic.billing.receiptsUnavailable'))
    }
    const portalURL = new URL((response as { portalUrl: string }).portalUrl)
    if (portalURL.protocol !== 'https:' || !/(^|\.)stripe\.com$/.test(portalURL.hostname) || portalURL.username || portalURL.password) {
      throw new Error(pageText('dynamic.billing.receiptsUnavailable'))
    }
    window.location.assign(portalURL.toString())
  }, [])

  const cancelSubscription = useCallback(async (subscriptionID: string) => {
    if (!/^bsub_[A-Za-z0-9_-]+$/.test(subscriptionID)) throw new Error(pageText('dynamic.billing.cancelRenewalFailed'))
    const idempotencyKey = cancellationAttemptKey(subscriptionID, cancellationAttempts.current)
    const response = await api<unknown>(`/billing/subscriptions/${encodeURIComponent(subscriptionID)}/cancel`, {
      method: 'POST', body: { mode: 'period_end' }, idempotencyKey,
    })
    const result = parseBillingCancellationResult(response)
    if (result === null || result.subscriptionId !== subscriptionID) {
      throw new Error(pageText('dynamic.billing.cancelRenewalFailed'))
    }
    completeCancellationAttempt(subscriptionID, cancellationAttempts.current)
    return result
  }, [])

  return { ...state, refresh, openCustomerPortal, cancelSubscription }
}
