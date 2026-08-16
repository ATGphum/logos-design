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
  const generation = useRef(0)
  const active = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setState((current) => ({ ...current, loading: true, fresh: false, error: '' }))
    try {
      const payload = await api<unknown>('/billing/history', { signal: controller.signal })
      if (controller.signal.aborted || generation.current !== requestGeneration) return
      const history = parseBillingTopupHistory(payload)
      if (history === null) throw new Error(pageText('dynamic.billing.historyRefreshFailed'))
      setState({ history, available: true, fresh: true, loading: false, error: '' })
    } catch (error) {
      if (controller.signal.aborted || generation.current !== requestGeneration) return
      setState((current) => ({
        ...current,
        loading: false,
        fresh: false,
        error: apiErrorMessage(error, pageText('dynamic.billing.rechargeHistoryRefreshFailed')),
      }))
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      active.current?.abort()
      generation.current += 1
      setState(initialState)
      return
    }
    void refresh()
    return () => active.current?.abort()
  }, [enabled, refresh])

  return { ...state, refresh }
}
