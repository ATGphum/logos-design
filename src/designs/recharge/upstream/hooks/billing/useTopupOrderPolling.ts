import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import {
  billingTopupPollingDecision,
  parseBillingTopupOrderStatus,
  type BillingTopupOrderStatus,
} from '../../topupTypes'
import { billingPollingDefaults } from './billingPollingPolicy'
import { pageText } from '../../i18n/pageText'

export type TopupOrderPollingOptions = Readonly<{
  pendingIntervalMs?: number
  retryIntervalMs?: number
  maxDurationMs?: number
}>

function boundedMilliseconds(value: number | undefined, fallback: number, maximum: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.min(maximum, Math.max(10, Math.floor(value)))
}

export function useTopupOrderPolling(orderID: string | null, enabled = true, options: TopupOrderPollingOptions = {}) {
  const pendingIntervalMs = boundedMilliseconds(options.pendingIntervalMs, billingPollingDefaults.pendingIntervalMs, 60_000)
  const retryIntervalMs = boundedMilliseconds(options.retryIntervalMs, billingPollingDefaults.retryIntervalMs, 60_000)
  const maxDurationMs = boundedMilliseconds(options.maxDurationMs, billingPollingDefaults.maxDurationMs, 24 * 60 * 60 * 1_000)
  const validOrderID = orderID !== null && /^bord_[A-Za-z0-9_-]+$/.test(orderID)
  const canPoll = enabled && validOrderID
  const [status, setStatus] = useState<BillingTopupOrderStatus | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const generation = useRef(0)
  const startedAt = useRef(Date.now())
  const timer = useRef<number | null>(null)
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  const stopped = useRef(!canPoll)
  const pollRef = useRef<() => Promise<void>>(async () => undefined)

  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }, [])

  const cancelWork = useCallback(() => {
    generation.current += 1
    active.current?.abort()
    active.current = null
    clearTimer()
  }, [clearTimer])

  const schedule = useCallback((delayMs: number) => {
    clearTimer()
    if (!mounted.current || stopped.current) return
    timer.current = window.setTimeout(() => {
      timer.current = null
      void pollRef.current()
    }, delayMs)
  }, [clearTimer])

  const poll = useCallback(async () => {
    clearTimer()
    if (!mounted.current || stopped.current || !enabled || !validOrderID || orderID === null) return
    if (Date.now() - startedAt.current >= maxDurationMs) {
      stopped.current = true
      setLoading(false)
      setError(pageText('dynamic.billing.rechargePollingPaused'))
      return
    }
    if (document.visibilityState === 'hidden') {
      setLoading(false)
      return
    }
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setLoading(true)
    try {
      const payload = await api<unknown>(`/billing/orders/${encodeURIComponent(orderID)}`, { signal: controller.signal })
      const parsed = parseBillingTopupOrderStatus(payload)
      if (parsed === null || parsed.id !== orderID) throw new Error(pageText('dynamic.billing.rechargeStatusUnavailable'))
      if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) return
      active.current = null
      setStatus(parsed)
      setError('')
      setLoading(false)
      if (billingTopupPollingDecision(parsed) === 'continue') schedule(pendingIntervalMs)
      else stopped.current = true
    } catch (pollError) {
      if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) return
      active.current = null
      setLoading(false)
      setError(apiErrorMessage(pollError, pageText('dynamic.billing.rechargeStatusUnavailable')))
      schedule(retryIntervalMs)
    }
  }, [clearTimer, enabled, maxDurationMs, orderID, pendingIntervalMs, retryIntervalMs, schedule, validOrderID])
  pollRef.current = poll

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      cancelWork()
    }
  }, [cancelWork])

  useEffect(() => {
    cancelWork()
    stopped.current = !canPoll
    startedAt.current = Date.now()
    setStatus(null)
    setError('')
    setLoading(false)
    if (canPoll) void pollRef.current()
    return cancelWork
  }, [canPoll, cancelWork, maxDurationMs, orderID, pendingIntervalMs, retryIntervalMs])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelWork()
        if (mounted.current) setLoading(false)
        return
      }
      if (canPoll && !stopped.current) void pollRef.current()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [canPoll, cancelWork])

  const refresh = useCallback(() => {
    startedAt.current = Date.now()
    stopped.current = !canPoll
    clearTimer()
    if (mounted.current) setError('')
    return pollRef.current()
  }, [canPoll, clearTimer])

  const replaceStatus = useCallback((next: BillingTopupOrderStatus) => {
    if (!validOrderID || orderID === null || next.id !== orderID) return
    clearTimer()
    stopped.current = billingTopupPollingDecision(next) !== 'continue'
    setStatus(next)
    setError('')
    setLoading(false)
  }, [clearTimer, orderID, validOrderID])

  return { status, error, loading, refresh, replaceStatus }
}
