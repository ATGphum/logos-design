import { CircleDollarSign, Clock3, ShieldCheck, WalletCards } from 'lucide-react'
import { formatBillingCreditUSD, type BillingRechargeAccount } from '../../billingTypes'
import { pageText } from '../../i18n/pageText'

type RechargeOverviewProps = {
  account: BillingRechargeAccount | null
  available: boolean
  fresh: boolean
  loading: boolean
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

export function RechargeOverview({ account, available, fresh, loading, onRetry }: RechargeOverviewProps) {
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
          <em className={`billing-status-pill billing-status-pill--${fresh ? 'active' : 'pending'}`}>{fresh ? pageText('billing.rechargeOverview.verified') : pageText('billing.rechargeOverview.lastVerified')}</em>
        </div>
        <div className="recharge-balance__value" aria-live="polite">{formatBillingCreditUSD(account.balanceMicros)}</div>
        <p>{pageText('billing.rechargeOverview.creditIsConsumedByServiceUsageRechargeDoesNot')}</p>
        <div className="recharge-balance__facts" aria-label={pageText('billing.rechargeOverview.creditProperties')}>
          <span><ShieldCheck size={16} aria-hidden="true" />{pageText('billing.rechargeOverview.serverAuthoritativeBalance')}</span>
          <span><Clock3 size={16} aria-hidden="true" />{pageText('billing.rechargeOverview.creditDoesNotExpire')}</span>
        </div>
      </section>

      <section className="recharge-entry" aria-labelledby="recharge-entry-title">
        <div>
          <small>{pageText('billing.rechargeOverview.oneTimeCredit')}</small>
          <h2 id="recharge-entry-title">{pageText('billing.rechargeOverview.rechargeBalance')}</h2>
          <p>{pageText('billing.rechargeOverview.addUsdCreditWithAOneTimePaymentEach')}</p>
        </div>
        <div className={`recharge-entry__status recharge-entry__status--${availability.kind}`} role="status" aria-live="polite">
          <WalletCards size={20} aria-hidden="true" />
          <span><strong>{availability.label}</strong><small>{availability.detail}</small></span>
        </div>
        {account.topup.activeOrderId !== null ? (
          <div className="recharge-entry__reference"><span>{pageText('billing.rechargeOverview.activePayment')}</span><code>{account.topup.activeOrderId}</code></div>
        ) : null}
      </section>
    </div>
  )
}
