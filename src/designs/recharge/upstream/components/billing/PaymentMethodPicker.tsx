import { CreditCard, Orbit } from 'lucide-react'
import { billingPaymentMethodAvailability } from '../../billingPaymentMethods'
import type { BillingPaymentMethod, BillingPlan, BillingPublicConfig } from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

const methods = () => ({
  stripe: { label: pageText('billing.paymentMethodPicker.stripe'), detail: pageText('billing.paymentMethodPicker.cardAndEligibleExpressMethods'), icon: CreditCard },
  tao: { label: pageText('billing.paymentMethodPicker.payWithTao'), detail: pageText('billing.paymentMethodPicker.oneTimeTransferOnBittensorMainnet'), icon: Orbit },
})

export function PaymentMethodPicker({ plan, config, value, onChange }: {
  plan: BillingPlan
  config: BillingPublicConfig | null
  value: BillingPaymentMethod | null
  onChange: (method: BillingPaymentMethod) => void
}) {
  const availability = billingPaymentMethodAvailability(plan, config)
  const anyEnabled = availability.stripe.enabled || availability.tao.enabled

  return (
    <fieldset className="billing-method-picker">
      <legend>{pageText('billing.paymentMethodPicker.paymentMethod')}</legend>
      {(Object.keys(methods()) as BillingPaymentMethod[]).map((id) => {
        const method = methods()[id]
        const capability = availability[id]
        const Icon = method.icon
        const selected = value === id
        const descriptionID = `billing-payment-${id}-description`
        return (
          <label className={`billing-method ${selected ? 'billing-method--selected' : ''} ${!capability.enabled ? 'billing-method--disabled' : ''}`} key={id}>
            <input
              type="radio"
              name="billing-payment-method"
              value={id}
              checked={selected}
              disabled={!capability.enabled}
              aria-describedby={descriptionID}
              onChange={() => onChange(id)}
            />
            <Icon size={20} aria-hidden="true" />
            <span className="billing-method__body">
              <span className="billing-method__title"><b>{method.label}</b>{selected ? <em>{pageText('billing.paymentMethodPicker.selected')}</em> : null}</span>
              <small>{method.detail}</small>
              {id === 'stripe' && config?.stripe.enabled ? (
                <span className="billing-method__capabilities" aria-label={pageText('billing.paymentMethodPicker.stripeCheckoutComponents')}>
                  <span className={config.stripe.paymentElementEnabled ? '' : 'is-disabled'}>{pageText('billing.paymentMethodPicker.cardViaPaymentElement')}</span>
                  <span className={config.stripe.expressCheckoutEnabled ? '' : 'is-disabled'}>{pageText('billing.paymentMethodPicker.expressCheckoutAfterContinue')}</span>
                </span>
              ) : null}
              {id === 'stripe' && capability.enabled && config?.stripe.expressCheckoutEnabled ? (
                <small id={descriptionID}>{pageText('billing.paymentMethodPicker.stripeDecidesWhetherApplePayGooglePayLinkOr')}</small>
              ) : (
                <small id={descriptionID} className={capability.enabled ? '' : 'billing-method__reason'}>
                  {capability.enabled ? pageText('billing.paymentMethodPicker.theServerHasVerifiedThisCheckoutPath') : capability.reason}
                </small>
              )}
            </span>
          </label>
        )
      })}
      {!anyEnabled ? (
        <p className="billing-inline-note" role="status">{pageText('billing.paymentMethodPicker.noPaymentMethodIsCurrentlySelectableReviewTheDisabled')}</p>
      ) : null}
    </fieldset>
  )
}
