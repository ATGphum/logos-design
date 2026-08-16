import { Check, Cpu, HardDrive, Server } from 'lucide-react'
import type { BillingPlan } from '../../billingTypes'
import { formatCurrency, formatDecimal } from '../../utils/format'
import { pageText } from '../../i18n/pageText'
import { billingPlanDiscountLabel, billingPlanName } from '../../billingCatalogText'

function bytes(value: number) {
  const gib = value / (1024 ** 3)
  return `${formatDecimal(gib, { maximumFractionDigits: 1 })} GiB`
}

export function PlanCard({ plan, selected, onSelect }: { plan: BillingPlan; selected: boolean; onSelect: () => void }) {
  const cadence = plan.duration.unit === 'day'
    ? pageText('billing.catalog.durationDays', { count: plan.duration.count })
    : pageText('billing.catalog.durationMonths', { count: plan.duration.count })
  const discountLabel = billingPlanDiscountLabel(plan)
  return (
    <button
      className={`billing-plan-card ${selected ? 'billing-plan-card--selected' : ''}`}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
    >
      <span className="billing-plan-card__top">
        <span>
          <strong>{billingPlanName(plan)}</strong>
          <small>{cadence}</small>
        </span>
        {discountLabel ? <span className="billing-plan-card__discount">{discountLabel}</span> : null}
      </span>
      <span className="billing-plan-card__price">
        <b>{formatCurrency(Number(plan.price.total), plan.price.currency)}</b>
        <small>{plan.price.currency}  {pageText('billing.planCard.total')}</small>
      </span>
      {plan.price.displayMonthly ? <span className="billing-plan-card__monthly">{formatCurrency(Number(plan.price.displayMonthly), plan.price.currency)}{pageText('billing.planCard.monthEquivalent')}</span> : (
        <span className="billing-plan-card__monthly">{pageText('billing.planCard.oneTimeFixedTerm')}</span>
      )}
      <span className="billing-plan-card__features">
        <span><Server size={15} />{plan.entitlementPolicy.includedActiveInstances}  {pageText('billing.planCard.activeInstances')}</span>
        <span><Cpu size={15} />{plan.entitlementPolicy.cpuCoresPerInstance}  {pageText('billing.planCard.cpuCores')} {bytes(plan.entitlementPolicy.memoryBytesPerInstance)}  {pageText('billing.planCard.memory')}</span>
        <span><HardDrive size={15} />{bytes(plan.entitlementPolicy.workspaceBytesPerInstance)}  {pageText('billing.planCard.workspacePerInstance')}</span>
      </span>
      <span className="billing-plan-card__selected"><Check size={15} />{selected ? pageText('billing.planCard.selected') : pageText('billing.planCard.choosePlan')}</span>
    </button>
  )
}
