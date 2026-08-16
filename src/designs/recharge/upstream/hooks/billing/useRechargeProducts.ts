import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import { parseBillingTopupProducts, type BillingTopupProduct } from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

type RechargeProductsState = {
  items: readonly BillingTopupProduct[]
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
}

const initialState: RechargeProductsState = {
  items: Object.freeze([]),
  available: false,
  fresh: false,
  loading: false,
  error: '',
}

export function useRechargeProducts(enabled: boolean) {
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
      const payload = await api<unknown>('/billing/topup-products', { signal: controller.signal })
      if (controller.signal.aborted || generation.current !== requestGeneration) return
      const items = parseBillingTopupProducts(payload)
      if (items === null) throw new Error(pageText('dynamic.billing.rechargeAmountsRefreshFailed'))
      setState({ items, available: true, fresh: true, loading: false, error: '' })
    } catch (error) {
      if (controller.signal.aborted || generation.current !== requestGeneration) return
      setState((current) => ({
        ...current,
        loading: false,
        fresh: false,
        error: apiErrorMessage(error, pageText('dynamic.billing.rechargeAmountsRefreshFailed')),
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
