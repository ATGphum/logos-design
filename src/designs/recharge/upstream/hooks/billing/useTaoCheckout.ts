import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorCode, apiErrorMessage, apiErrorStatus } from '../../api'
import type { BillingTopupProduct } from '../../billingTypes'
import {
  TaoManualCheckoutController,
  TaoManualCheckoutError,
  parseTaoCheckoutCancellation,
  taoManualPaymentOption,
  type TaoManualCheckoutRequest,
  type TaoManualTransferInstructions,
} from './taoManualTransfer'
import { pageText } from '../../i18n/pageText'

export type TaoManualCheckoutPreparation =
  | { phase: 'entering_sender' }
  | { phase: 'preparing'; senderAddress: string }
  | {
      phase: 'awaiting_transfer'
      attemptVersion: number
      instructions: TaoManualTransferInstructions
    }
  | {
      phase: 'error'
      message: string
      canRetry: boolean
      canStartNewAttempt: boolean
    }

async function requestManualTaoCheckout(request: TaoManualCheckoutRequest) {
  return api<unknown>('/billing/checkout/tao', {
    method: 'POST',
    body: {
      productId: request.productId,
      ...(request.amountMicros === undefined ? {} : { amountMicros: request.amountMicros }),
      walletAddress: request.walletAddress,
    },
    idempotencyKey: request.idempotencyKey,
    signal: request.signal,
  })
}

async function requestTaoCheckoutCancellation(orderId: string) {
  return api<unknown>(`/billing/orders/${encodeURIComponent(orderId)}/tao-checkout`, { method: 'DELETE' })
}

function aborted(error: unknown) {
  return error instanceof TaoManualCheckoutError && error.code === 'manual_checkout_aborted'
}

function checkoutErrorState(error: unknown): Extract<TaoManualCheckoutPreparation, { phase: 'error' }> {
  if (error instanceof TaoManualCheckoutError) {
    return {
      phase: 'error',
      message: apiErrorMessage(error),
      canRetry: false,
      canStartNewAttempt: error.code === 'manual_quote_expired' || error.code === 'manual_checkout_response_invalid',
    }
  }
  const status = apiErrorStatus(error)
  const code = apiErrorCode(error)
  const conflict = status === 409 || code === 'invalid_state' || code === 'billing_order_conflict' ||
    code === 'tao_quote_conflict'
  if (conflict) {
    return {
      phase: 'error',
      message: apiErrorMessage(error, pageText('dynamic.billing.paymentConflict')),
      canRetry: false,
      canStartNewAttempt: false,
    }
  }
  return {
    phase: 'error',
    message: apiErrorMessage(error, pageText('dynamic.billing.manualTaoPreparationFailed')),
    canRetry: true,
    canStartNewAttempt: false,
  }
}

export function useTaoCheckout(product: BillingTopupProduct) {
  const controller = useRef<TaoManualCheckoutController | null>(null)
  if (controller.current === null) controller.current = new TaoManualCheckoutController(requestManualTaoCheckout)
  const [manualPreparation, setManualPreparation] = useState<TaoManualCheckoutPreparation>({ phase: 'entering_sender' })
  const requestGeneration = useRef(0)
  const productSignature = `${product.id}:${product.paidMicros}:${product.creditedMicros}:${product.revision}`
  const previousProductSignature = useRef(productSignature)

  const prepareManualTransfer = useCallback(async (senderAddress: string, startNewAttempt = false) => {
    const activeController = controller.current
    if (activeController === null) return
    const generation = requestGeneration.current + 1
    requestGeneration.current = generation
    setManualPreparation({ phase: 'preparing', senderAddress })
    try {
      const result = await activeController.prepare(product, senderAddress, startNewAttempt)
      if (generation !== requestGeneration.current) return
      setManualPreparation({
        phase: 'awaiting_transfer',
        attemptVersion: result.attemptVersion,
        instructions: result.instructions,
      })
    } catch (error) {
      if (aborted(error) || generation !== requestGeneration.current) return
      setManualPreparation(checkoutErrorState(error))
    }
  }, [product])

  const retryManualTransfer = useCallback(async () => {
    const activeController = controller.current
    if (activeController === null || activeController.currentAttempt() === undefined) return
    const generation = requestGeneration.current + 1
    requestGeneration.current = generation
    const senderAddress = activeController.currentAttempt()?.walletAddress ?? ''
    setManualPreparation({ phase: 'preparing', senderAddress })
    try {
      const result = await activeController.retry()
      if (generation !== requestGeneration.current) return
      setManualPreparation({
        phase: 'awaiting_transfer',
        attemptVersion: result.attemptVersion,
        instructions: result.instructions,
      })
    } catch (error) {
      if (aborted(error) || generation !== requestGeneration.current) return
      setManualPreparation(checkoutErrorState(error))
    }
  }, [])

  const cancelManualTransfer = useCallback(async (orderId: string) => {
    const payload = await requestTaoCheckoutCancellation(orderId)
    const result = parseTaoCheckoutCancellation(payload, orderId)
    if (result === null) throw new TaoManualCheckoutError('manual_checkout_response_invalid')
    requestGeneration.current += 1
    controller.current?.reset()
    setManualPreparation({ phase: 'entering_sender' })
    return result
  }, [])

  useEffect(() => {
    if (previousProductSignature.current !== productSignature) {
      previousProductSignature.current = productSignature
      requestGeneration.current += 1
      controller.current?.abort()
      setManualPreparation({ phase: 'entering_sender' })
    }
    return () => controller.current?.abort()
  }, [productSignature])

  return {
    manualPaymentOption: taoManualPaymentOption,
    manualPreparation,
    prepareManualTransfer: (senderAddress: string) => prepareManualTransfer(senderAddress, false),
    retryManualTransfer,
    startNewManualAttempt: (senderAddress: string) => prepareManualTransfer(senderAddress, true),
    cancelManualTransfer,
  }
}
