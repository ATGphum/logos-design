import type { BillingPaymentMethod, BillingPlan, BillingPublicConfig } from './billingTypes'

export type BillingPaymentMethodAvailability = Readonly<{
  enabled: boolean
  reason: string
}>

export type BillingPaymentMethodAvailabilityMap = Readonly<Record<BillingPaymentMethod, BillingPaymentMethodAvailability>>

const unverifiedReason = 'Payment capability could not be verified. Refresh Billing and try again.'

export function billingPaymentMethodAvailability(
  plan: BillingPlan,
  config: BillingPublicConfig | null,
): BillingPaymentMethodAvailabilityMap {
  if (config === null) {
    const unavailable = Object.freeze({ enabled: false, reason: unverifiedReason })
    return Object.freeze({ stripe: unavailable, tao: unavailable })
  }

  const stripe = !config.stripe.enabled
    ? { enabled: false, reason: 'Stripe checkout is disabled by the server.' }
    : !config.stripe.paymentElementEnabled && !config.stripe.expressCheckoutEnabled
      ? { enabled: false, reason: 'Stripe payment components are not available.' }
      : !plan.paymentMethods.stripe
        ? { enabled: false, reason: 'Stripe checkout is not available for this plan.' }
        : { enabled: true, reason: '' }

  const tao = !config.tao.enabled
    ? { enabled: false, reason: 'TAO checkout is disabled by the server.' }
    : !plan.paymentMethods.tao
      ? { enabled: false, reason: 'TAO checkout is not available for this plan.' }
      : { enabled: true, reason: '' }

  return Object.freeze({ stripe: Object.freeze(stripe), tao: Object.freeze(tao) })
}

export function billingPaymentMethodEnabled(
  plan: BillingPlan,
  config: BillingPublicConfig | null,
  method: BillingPaymentMethod,
) {
  return billingPaymentMethodAvailability(plan, config)[method].enabled
}
