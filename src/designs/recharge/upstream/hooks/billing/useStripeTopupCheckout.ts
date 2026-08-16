import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import {
  parseBillingStripeCheckoutSession,
  parseBillingStripePublicConfig,
  type BillingStripeCheckoutSession,
  type BillingStripePublicConfig,
  type BillingTopupProduct,
} from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

type StripeTopupCheckoutPreparation =
  | { phase: 'preparing' }
  | {
      phase: 'ready'
      attemptVersion: number
      config: BillingStripePublicConfig
      session: BillingStripeCheckoutSession
    }
  | { phase: 'error'; message: string }

function newTopupCheckoutIdempotencyKey() {
  return `billing-topup-checkout-${crypto.randomUUID()}`
}

function aborted(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useStripeTopupCheckout(product: BillingTopupProduct) {
  const [preparation, setPreparation] = useState<StripeTopupCheckoutPreparation>({ phase: 'preparing' })
  const idempotencyKey = useRef(newTopupCheckoutIdempotencyKey())
  const attemptVersion = useRef(1)
  const activeRequest = useRef<AbortController | null>(null)
  const requestGeneration = useRef(0)
  const selectionKey = `${product.id}:${product.customAmount.enabled ? product.paidMicros : 'catalog'}`
  const previousSelectionKey = useRef(selectionKey)

  const prepare = useCallback(async () => {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    const generation = requestGeneration.current + 1
    requestGeneration.current = generation
    setPreparation({ phase: 'preparing' })
    try {
      const publicConfigPayload = await api<unknown>('/billing/config', { signal: controller.signal })
      const config = parseBillingStripePublicConfig(publicConfigPayload)
      if (!config) throw new Error(pageText('billing.stripeCheckout.secureCardPaymentIsNotConfiguredYet'))

      const checkoutPayload = await api<unknown>('/billing/checkout/stripe', {
        method: 'POST',
        body: {
          productId: product.id,
          ...(product.customAmount.enabled ? { amountMicros: product.paidMicros } : {}),
        },
        idempotencyKey: idempotencyKey.current,
        signal: controller.signal,
      })
      const session = parseBillingStripeCheckoutSession(checkoutPayload, config)
      if (!session) throw new Error(pageText('billing.stripeCheckout.secureCardPaymentCouldNotBeInitializedPleaseTryAgain'))
      if (controller.signal.aborted || generation !== requestGeneration.current) return
      setPreparation({ phase: 'ready', attemptVersion: attemptVersion.current, config, session })
    } catch (error) {
      if (aborted(error) || controller.signal.aborted || generation !== requestGeneration.current) return
      setPreparation({
        phase: 'error',
        message: apiErrorMessage(error, pageText('billing.stripeCheckout.secureCardPaymentCouldNotBeInitializedPleaseTryAgain')),
      })
    }
  }, [product.customAmount.enabled, product.id, product.paidMicros])

  useEffect(() => {
    if (previousSelectionKey.current !== selectionKey) {
      previousSelectionKey.current = selectionKey
      idempotencyKey.current = newTopupCheckoutIdempotencyKey()
      attemptVersion.current += 1
    }
    void prepare()
    return () => activeRequest.current?.abort()
  }, [prepare, selectionKey])

  return {
    preparation,
    retry: prepare,
  }
}

export function useStripeTopupCheckoutResume(orderID: string) {
	const [preparation, setPreparation] = useState<StripeTopupCheckoutPreparation>({ phase: 'preparing' })
	const activeRequest = useRef<AbortController | null>(null)
	const requestGeneration = useRef(0)

	const prepare = useCallback(async () => {
		activeRequest.current?.abort()
		const controller = new AbortController()
		activeRequest.current = controller
		const generation = requestGeneration.current + 1
		requestGeneration.current = generation
		setPreparation({ phase: 'preparing' })
		try {
			const publicConfigPayload = await api<unknown>('/billing/config', { signal: controller.signal })
			const config = parseBillingStripePublicConfig(publicConfigPayload)
			if (!config) throw new Error(pageText('billing.stripeCheckout.secureCardPaymentIsNotConfiguredYet'))

			const checkoutPayload = await api<unknown>(`/billing/orders/${encodeURIComponent(orderID)}/stripe-checkout`, {
				signal: controller.signal,
			})
			const session = parseBillingStripeCheckoutSession(checkoutPayload, config)
			if (!session || session.orderId !== orderID) {
				throw new Error(pageText('billing.stripeCheckout.secureCardPaymentCouldNotBeInitializedPleaseTryAgain'))
			}
			if (controller.signal.aborted || generation !== requestGeneration.current) return
			setPreparation({ phase: 'ready', attemptVersion: generation, config, session })
		} catch (error) {
			if (aborted(error) || controller.signal.aborted || generation !== requestGeneration.current) return
			setPreparation({
				phase: 'error',
				message: apiErrorMessage(error, pageText('billing.stripeCheckout.secureCardPaymentCouldNotBeInitializedPleaseTryAgain')),
			})
		}
	}, [orderID])

	useEffect(() => {
		void prepare()
		return () => activeRequest.current?.abort()
	}, [prepare])

	return { preparation, retry: prepare }
}
