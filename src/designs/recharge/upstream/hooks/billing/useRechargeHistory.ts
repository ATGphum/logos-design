import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import { parseBillingTopupHistory, type BillingTopupHistory } from '../../topupTypes'
import { pageText } from '../../i18n/pageText'

type RechargeHistoryState = {
  history: BillingTopupHistory
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
}

const emptyHistory: BillingTopupHistory = Object.freeze({ items: Object.freeze([]) })
const initialState: RechargeHistoryState = {
  history: emptyHistory,
  available: false,
  fresh: false,
  loading: true,
  error: '',
}

export function useRechargeHistory(enabled = true) {
  const [state, setState] = useState(initialState)
  const mounted = useRef(false)
  const generation = useRef(0)
  const active = useRef<Readonly<{ controller: AbortController; promise: Promise<void> }> | null>(null)

  const abort = useCallback(() => {
    generation.current += 1
    active.current?.controller.abort()
    active.current = null
    if (mounted.current) setState((current) => ({ ...current, loading: false, fresh: false }))
  }, [])

  const refresh = useCallback((): Promise<void> => {
    if (!enabled) return Promise.resolve()
    if (active.current !== null) return active.current.promise
    const controller = new AbortController()
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setState((current) => ({ ...current, loading: true, fresh: false, error: '' }))
    const promise = (async () => {
      try {
        const payload = await api<unknown>('/billing/history', { signal: controller.signal })
        if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) return
        const history = parseBillingTopupHistory(payload)
        if (history === null) throw new Error(pageText('dynamic.billing.historyRefreshFailed'))
        setState({ history, available: true, fresh: true, loading: false, error: '' })
      } catch (error) {
        if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) return
        setState((current) => ({
          ...current,
          loading: false,
          fresh: false,
          error: apiErrorMessage(error, pageText('dynamic.billing.rechargeHistoryRefreshFailed')),
        }))
      } finally {
        if (active.current?.controller === controller) active.current = null
      }
    })()
    active.current = Object.freeze({ controller, promise })
    return promise
  }, [enabled])

  useEffect(() => {
    mounted.current = true
    if (!enabled) {
      active.current?.controller.abort()
      active.current = null
      generation.current += 1
      setState(initialState)
    } else {
      void refresh()
    }
    return () => {
      mounted.current = false
      generation.current += 1
      active.current?.controller.abort()
      active.current = null
    }
  }, [enabled, refresh])

  return { ...state, refresh, abort }
}
