import type { BillingPlan, BillingTopupProduct } from './billingTypes'
import { pageText } from './i18n/pageText'

const SYSTEM_TOPUP_PRODUCT_CODES = new Set([
  'topup_usd_2',
  'topup_usd_20',
  'topup_usd_50',
  'topup_usd_80',
  'topup_usd_100',
  'topup_custom',
])

// Server names remain compatibility fallbacks for custom catalog entries.
// Built-in entries use their stable code so a locale change never mutates domain data.
export function billingPlanName(plan: BillingPlan): string {
  switch (plan.code) {
    case 'pro_7d': return pageText('billing.catalog.planPro7Day')
    case 'pro_quarterly': return pageText('billing.catalog.planProQuarterly')
    case 'pro_6_months': return pageText('billing.catalog.planPro6Months')
    default: return plan.name
  }
}

export function billingPlanDiscountLabel(plan: BillingPlan): string | undefined {
  return plan.discountLabel
}

export function billingTopupProductName(product: BillingTopupProduct): string {
  if (!SYSTEM_TOPUP_PRODUCT_CODES.has(product.code)) return product.name
  return pageText('billing.catalog.creditAmount', { amount: product.displayAmount })
}
