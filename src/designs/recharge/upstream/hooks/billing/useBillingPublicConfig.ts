import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import { parseBillingPublicConfig, type BillingPublicConfig } from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

type BillingPublicConfigState = {
  config: BillingPublicConfig | null
  fresh: boolean
  loading: boolean
  error: string
}

const initialState: BillingPublicConfigState = {
  config: null,
  fresh: false,
  loading: true,
  error: '',
}

export function useBillingPublicConfig() {
  const [state, setState] = useState(initialState)
  const generation = useRef(0)
  const active = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setState((current) => ({ ...current, fresh: false, loading: true, error: '' }))
    try {
      const payload = await api<unknown>('/billing/config', { signal: controller.signal })
      if (controller.signal.aborted || generation.current !== requestGeneration) return
      const config = parseBillingPublicConfig(payload)
      if (config === null) throw new Error(pageText('dynamic.billing.paymentMethodsRefreshFailed'))
      setState({ config, fresh: true, loading: false, error: '' })
    } catch (error) {
      if (controller.signal.aborted || generation.current !== requestGeneration) return
      setState((current) => ({
        ...current,
        fresh: false,
        loading: false,
        error: apiErrorMessage(error, pageText('dynamic.billing.browserWalletRefreshFailed')),
      }))
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => active.current?.abort()
  }, [refresh])

  return { ...state, refresh }
}
