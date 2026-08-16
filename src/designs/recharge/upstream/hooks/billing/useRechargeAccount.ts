import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import { parseBillingRechargeAccount, type BillingRechargeAccount } from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

type RechargeAccountState = {
  account: BillingRechargeAccount | null
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
}

const initialState: RechargeAccountState = {
  account: null,
  available: false,
  fresh: false,
  loading: true,
  error: '',
}

export function useRechargeAccount() {
  const [state, setState] = useState(initialState)
  const generation = useRef(0)
  const active = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setState((current) => ({ ...current, loading: true, fresh: false, error: '' }))
    try {
      const payload = await api<unknown>('/billing/me', { signal: controller.signal })
      if (controller.signal.aborted || generation.current !== requestGeneration) return
      const account = parseBillingRechargeAccount(payload)
      if (account === null) throw new Error(pageText('dynamic.billing.accountRefreshFailed'))
      setState({ account, available: true, fresh: true, loading: false, error: '' })
    } catch (error) {
      if (controller.signal.aborted || generation.current !== requestGeneration) return
      setState((current) => ({
        ...current,
        loading: false,
        fresh: false,
        error: apiErrorMessage(error, pageText('dynamic.billing.currentCreditRefreshFailed')),
      }))
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => active.current?.abort()
  }, [refresh])

  return { ...state, refresh }
}
