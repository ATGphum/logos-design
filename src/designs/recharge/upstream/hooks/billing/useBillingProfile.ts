import { useEffect, useState } from 'react'
import { api } from '../../api'
import { parseBillingRechargeAccount, type BillingRechargeAccount } from '../../billingTypes'

type BillingProfileState = {
  account: BillingRechargeAccount | null
  available: boolean
  loading: boolean
}

const initialState: BillingProfileState = {
  account: null,
  available: true,
  loading: false,
}

export function useBillingProfile(enabled: boolean) {
  const [state, setState] = useState(initialState)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setState((current) => ({ ...current, loading: true }))

    void api<unknown>('/billing/me', { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return
        const account = parseBillingRechargeAccount(payload)
        setState({ account, available: account !== null, loading: false })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setState((current) => ({ ...current, available: false, loading: false }))
      })

    return () => controller.abort()
  }, [enabled])

  return state
}
