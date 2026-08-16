import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorCode, apiErrorMessage, apiErrorStatus } from '../../api'
import {
  parseBillingStripeCheckoutSession,
  parseBillingStripePublicConfig,
  type BillingStripeCheckoutSession,
  type BillingStripePublicConfig,
  type StripeCheckoutPlanID,
} from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

type StripeCheckoutPreparation =
  | { phase: 'preparing' }
  | {
      phase: 'ready'
      attemptVersion: number
      config: BillingStripePublicConfig
      session: BillingStripeCheckoutSession
    }
  | { phase: 'error'; message: string; canStartNewAttempt: boolean }

function newCheckoutIdempotencyKey() {
  return `billing-checkout-${crypto.randomUUID()}`
}

function aborted(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useStripeCheckout(planID: StripeCheckoutPlanID) {
  const [preparation, setPreparation] = useState<StripeCheckoutPreparation>({ phase: 'preparing' })
  const idempotencyKey = useRef(newCheckoutIdempotencyKey())
  const attemptVersion = useRef(1)
  const activeRequest = useRef<AbortController | null>(null)
  const requestGeneration = useRef(0)
  const previousPlanID = useRef(planID)

  const prepare = useCallback(async (startNewAttempt: boolean) => {
    activeRequest.current?.abort()
    if (startNewAttempt) {
      idempotencyKey.current = newCheckoutIdempotencyKey()
      attemptVersion.current += 1
    }
    const controller = new AbortController()
    activeRequest.current = controller
    const generation = requestGeneration.current + 1
    requestGeneration.current = generation
    setPreparation({ phase: 'preparing' })
    try {
      const publicConfigPayload = await api<unknown>('/billing/config', { signal: controller.signal })
      const config = parseBillingStripePublicConfig(publicConfigPayload)
      if (!config) throw new Error(pageText('dynamic.billing.stripeInitializationFailed'))

      const checkoutPayload = await api<unknown>('/billing/checkout/stripe', {
        method: 'POST',
        body: { planId: planID },
        idempotencyKey: idempotencyKey.current,
        signal: controller.signal,
      })
      const session = parseBillingStripeCheckoutSession(checkoutPayload, config)
      if (!session) throw new Error(pageText('dynamic.billing.stripeInitializationFailed'))
      if (controller.signal.aborted || generation !== requestGeneration.current) return
      setPreparation({ phase: 'ready', attemptVersion: attemptVersion.current, config, session })
    } catch (error) {
      if (aborted(error) || controller.signal.aborted || generation !== requestGeneration.current) return
      const status = apiErrorStatus(error)
      const code = apiErrorCode(error)
      setPreparation({
        phase: 'error',
        message: apiErrorMessage(error, pageText('dynamic.billing.stripeInitializationFailed')),
        canStartNewAttempt: status === 409 || code === 'invalid_state' || code === 'billing_order_conflict',
      })
    }
  }, [planID])

  useEffect(() => {
    if (previousPlanID.current !== planID) {
      previousPlanID.current = planID
      idempotencyKey.current = newCheckoutIdempotencyKey()
      attemptVersion.current += 1
    }
    void prepare(false)
    return () => activeRequest.current?.abort()
  }, [planID, prepare])

  return {
    preparation,
    retry: () => prepare(false),
    startNewAttempt: () => prepare(true),
  }
}
