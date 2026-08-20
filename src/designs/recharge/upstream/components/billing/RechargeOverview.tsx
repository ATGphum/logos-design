import type { Ref } from 'react'
import { CircleDollarSign, Clock3, Plus, ShieldCheck, WalletCards } from 'lucide-react'
import { formatBillingCreditUSD, type BillingRechargeAccount } from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

type RechargeOverviewProps = {
  account: BillingRechargeAccount | null
  available: boolean
  fresh: boolean
  loading: boolean
  addCreditsDisabled: boolean
  addCreditsTriggerRef: Ref<HTMLButtonElement>
  onAddCredits: () => void
  onRetry: () => void
}

function rechargeAvailability(account: BillingRechargeAccount) {
  if (!account.ledgerConfigured) {
    return { kind: 'unavailable', label: pageText('billing.rechargeOverview.creditLedgerUnavailable'), detail: pageText('billing.rechargeOverview.rechargeIsDisabledUntilTheCreditLedgerIsReady') } as const
  }
  if (account.topup.activeOrderId !== null) {
    return { kind: 'pending', label: pageText('billing.rechargeOverview.rechargeInProgress'), detail: pageText('billing.rechargeOverview.completeOrReviewTheCurrentPaymentBeforeStartingAnother') } as const
  }
  if (!account.topup.allowed) {
    return { kind: 'unavailable', label: pageText('billing.rechargeOverview.rechargeNotEnabledYet'), detail: pageText('billing.rechargeOverview.yourCurrentCreditRemainsAvailableRechargeAccessIsBeing') } as const
  }
  if (!account.topup.canCreateCheckout) {
    return { kind: 'unavailable', label: pageText('billing.rechargeOverview.rechargeTemporarilyUnavailable'), detail: pageText('billing.rechargeOverview.noPaymentCanBeStartedRightNowRefreshAnd') } as const
  }
  return { kind: 'ready', label: pageText('billing.rechargeOverview.readyToRecharge'), detail: pageText('billing.rechargeOverview.serverDefinedRechargeAmountsWillBeShownHere') } as const
}

export function RechargeOverview({ account, available, fresh, loading, addCreditsDisabled, addCreditsTriggerRef, onAddCredits, onRetry }: RechargeOverviewProps) {
  if (!available || account === null) {
    return (
      <section className="billing-empty cs-sec" aria-busy={loading} aria-live="polite">
        <WalletCards size={30} aria-hidden="true" />
        <h2>{loading ? pageText('billing.rechargeOverview.loadingCurrentCredit') : pageText('billing.rechargeOverview.currentCreditIsUnavailable')}</h2>
        <p>{loading ? pageText('billing.rechargeOverview.verifyingYourBalanceWithTheServer') : pageText('billing.rechargeOverview.noBalanceOrPaymentActionIsShownUntilThe')}</p>
        {!loading ? <button className="cs-btn" type="button" onClick={onRetry}>{pageText('billing.rechargeOverview.tryAgain')}</button> : null}
      </section>
    )
  }

  const availability = rechargeAvailability(account)
  return (
    <div className="recharge-overview cs-sec">
      <section className="recharge-balance" aria-labelledby="recharge-balance-title">
        <div className="recharge-balance__heading">
          <span><CircleDollarSign size={22} aria-hidden="true" /></span>
          <div>
            <small>{pageText('billing.rechargeOverview.availableUsdCredit')}</small>
            <h2 id="recharge-balance-title">{pageText('billing.rechargeOverview.currentBalance')}</h2>
          </div>
          {/* DESIGN SHIM: VERIFIED pill removed. */}
        </div>
        {/* DESIGN SHIM: the figure and the action share one row. Upstream puts them in
            separate grid columns, whose differing internal stacks meant no CSS offset
            aligned them in both the gallery and the console panel. */}
        <div className="rc-balance-row">
          <div className="recharge-balance__value" aria-live="polite">{formatBillingCreditUSD(account.balanceNanos)}</div>
          <button
            className="recharge-entry__action rc-balance-row__action"
            type="button"
            ref={addCreditsTriggerRef}
            disabled={addCreditsDisabled}
            onClick={onAddCredits}
          >
            <Plus size={17} aria-hidden="true" />
            {pageText('billing.rechargeOverview.addCredits')}
          </button>
        </div>
        <p>{pageText('billing.rechargeOverview.creditIsConsumedByServiceUsageRechargeDoesNot')}</p>
        {/* DESIGN SHIM: credit-properties row removed. */}
      </section>

      {availability.kind === 'ready' ? null : (
        <section className="recharge-entry" aria-labelledby="recharge-entry-title">
          <h2 id="recharge-entry-title" className="sr-only">{pageText('billing.rechargeOverview.addCredits')}</h2>
          <div className={`recharge-entry__status recharge-entry__status--${availability.kind}`} role="status" aria-live="polite">
            <WalletCards size={20} aria-hidden="true" />
            <span><strong>{availability.label}</strong><small>{availability.detail}</small></span>
          </div>
          {account.topup.activeOrderId !== null ? (
            <div className="recharge-entry__reference"><span>{pageText('billing.rechargeOverview.activePayment')}</span><code>{account.topup.activeOrderId}</code></div>
          ) : null}
        </section>
      )}
    </div>
  )
}
