import type { Ref } from 'react'
import { ArrowRight, CreditCard, Landmark } from 'lucide-react'
import { pageText } from '../../i18n/pageText'

export type RechargeMethodState = 'loading' | 'available' | 'degraded' | 'unavailable'

export type RechargeMethodAvailability = {
  state: RechargeMethodState
  detail: string
}

type RechargeMethodPickerProps = {
  stripe: RechargeMethodAvailability
  crypto: RechargeMethodAvailability
  stripeButtonRef?: Ref<HTMLButtonElement>
  onSelectStripe: () => void
  onSelectCrypto?: () => void
}

function methodStatus(state: RechargeMethodState) {
  switch (state) {
    case 'loading':
      return pageText('billing.rechargeMethodPicker.checking')
    case 'available':
      return pageText('billing.rechargeMethodPicker.available')
    case 'degraded':
      return pageText('billing.rechargeMethodPicker.limited')
    case 'unavailable':
      return pageText('billing.rechargeMethodPicker.unavailable')
  }
}

function methodEnabled(state: RechargeMethodState) {
  return state === 'available' || state === 'degraded'
}

export function RechargeMethodPicker({ stripe, crypto, stripeButtonRef, onSelectStripe, onSelectCrypto }: RechargeMethodPickerProps) {
  return (
    <section className="recharge-method-picker" aria-label={pageText('billing.rechargeMethodPicker.paymentMethods')}>
      <p className="recharge-method-picker__intro">{pageText('billing.rechargeMethodPicker.chooseThePaymentMethodThatWorksForYou')}</p>
      <div className="recharge-method-picker__cards">
        <button
          className="recharge-method-card"
          type="button"
          ref={stripeButtonRef}
          disabled={!methodEnabled(stripe.state)}
          onClick={onSelectStripe}
        >
          <span className="recharge-method-card__icon" aria-hidden="true"><CreditCard size={22} /></span>
          <span className="recharge-method-card__copy">
            <strong>{pageText('billing.rechargeMethodPicker.topUpWithStripe')}</strong>
            <small>{pageText('billing.rechargeMethodPicker.useACardOrEligibleExpressPayment')}</small>
            <em>{stripe.detail}</em>
          </span>
          <span className={`recharge-method-card__status recharge-method-card__status--${stripe.state}`}>{methodStatus(stripe.state)}</span>
          {methodEnabled(stripe.state) ? <ArrowRight className="recharge-method-card__arrow" size={18} aria-hidden="true" /> : null}
        </button>

        <button
          className="recharge-method-card"
          type="button"
          disabled={!methodEnabled(crypto.state)}
          onClick={onSelectCrypto}
        >
          <span className="recharge-method-card__icon" aria-hidden="true"><Landmark size={22} /></span>
          <span className="recharge-method-card__copy">
            <strong>{pageText('billing.rechargeMethodPicker.topUpWithCrypto')}</strong>
            <small>{pageText('billing.rechargeMethodPicker.sendSupportedAssetsToYourPersonalAddress')}</small>
            <em>{crypto.detail}</em>
          </span>
          <span className={`recharge-method-card__status recharge-method-card__status--${crypto.state}`}>{methodStatus(crypto.state)}</span>
          {methodEnabled(crypto.state) ? <ArrowRight className="recharge-method-card__arrow" size={18} aria-hidden="true" /> : null}
        </button>
      </div>
    </section>
  )
}
