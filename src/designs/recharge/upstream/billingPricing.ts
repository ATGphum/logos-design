import type { BillingPaymentMethod, BillingPlan } from './billingTypes'
import { formatCurrency } from './utils/format'

export type BillingPricePresentation = Readonly<{
  termLabel: string
  monthlyEquivalentLabel: string
  totalDueLabel: string
  renewalKind: 'automatic' | 'manual' | 'one_time' | 'choice_required' | 'unavailable'
  renewalLabel: string
  renewalDescription: string
}>

function termLabel(plan: BillingPlan) {
  return plan.billingMode === 'one_time'
    ? `${plan.duration.count}-${plan.duration.unit} fixed term`
    : `${plan.duration.count}-${plan.duration.unit} term`
}

function stripeRenewal(plan: BillingPlan): Pick<BillingPricePresentation, 'renewalKind' | 'renewalLabel' | 'renewalDescription'> {
  if (plan.billingMode === 'recurring') {
    return {
      renewalKind: 'automatic',
      renewalLabel: 'Automatic renewal with Stripe',
      renewalDescription: `Stripe renews this ${plan.duration.count}-${plan.duration.unit} term automatically unless you cancel before the next billing date.`,
    }
  }
  return {
    renewalKind: 'one_time',
    renewalLabel: 'One-time Stripe purchase',
    renewalDescription: 'This Stripe purchase is a fixed term and does not renew automatically.',
  }
}

function taoRenewal(): Pick<BillingPricePresentation, 'renewalKind' | 'renewalLabel' | 'renewalDescription'> {
  return {
    renewalKind: 'manual',
    renewalLabel: 'Manual renewal with TAO',
    renewalDescription: 'TAO does not renew automatically. It is a one-time on-chain payment, and access must be renewed manually after the selected term expires.',
  }
}

export function billingPricePresentation(plan: BillingPlan, selectedMethod: BillingPaymentMethod | null): BillingPricePresentation {
  const method = selectedMethod !== null && plan.paymentMethods[selectedMethod] ? selectedMethod : null
  let renewal: Pick<BillingPricePresentation, 'renewalKind' | 'renewalLabel' | 'renewalDescription'>

  if (method === 'stripe') {
    renewal = stripeRenewal(plan)
  } else if (method === 'tao') {
    renewal = taoRenewal()
  } else if (plan.paymentMethods.stripe && !plan.paymentMethods.tao) {
    renewal = stripeRenewal(plan)
  } else if (plan.paymentMethods.tao && !plan.paymentMethods.stripe) {
    renewal = taoRenewal()
  } else if (!plan.paymentMethods.stripe && !plan.paymentMethods.tao) {
    renewal = {
      renewalKind: 'unavailable',
      renewalLabel: 'Checkout unavailable',
      renewalDescription: 'No payment method is enabled for this term yet. The displayed price is for review only.',
    }
  } else if (plan.billingMode === 'recurring') {
    renewal = {
      renewalKind: 'choice_required',
      renewalLabel: 'Renewal depends on payment method',
      renewalDescription: 'Stripe renews this term automatically unless canceled. TAO is a one-time payment and must be renewed manually.',
    }
  } else {
    renewal = {
      renewalKind: 'one_time',
      renewalLabel: 'No automatic renewal',
      renewalDescription: 'This fixed term does not renew automatically with Stripe or TAO. Purchase another term to continue Pro access.',
    }
  }

  return Object.freeze({
    termLabel: termLabel(plan),
    monthlyEquivalentLabel: plan.price.displayMonthly === null
      ? 'Not offered for this fixed term'
      : `${formatCurrency(Number(plan.price.displayMonthly), plan.price.currency)} ${plan.price.currency} per month equivalent`,
    totalDueLabel: `${formatCurrency(Number(plan.price.total), plan.price.currency)} ${plan.price.currency}`,
    ...renewal,
  })
}
