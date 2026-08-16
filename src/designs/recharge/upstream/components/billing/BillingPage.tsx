import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useBillingPublicConfig, useRechargeAccount, useRechargeHistory, useRechargeProducts, useTopupOrderPolling } from '../../hooks/billing'
import { billingTopupPollingDecision } from '../../topupTypes'
import { RechargeHistory } from './RechargeHistory'
import { RechargeOverview } from './RechargeOverview'
import { RechargeOptions } from './RechargeOptions'
import { RechargeOrderStatus } from './RechargeOrderStatus'
import { RechargeSuccess } from './RechargeSuccess'
import './billing.css'
import { pageText } from '../../i18n/pageText'

const StripeTopupResumeCheckout = lazy(async () => {
  const module = await import('./StripeCheckout')
  return { default: module.StripeTopupResumeCheckout }
})

type PaletteMode = 'light' | 'dark'

const availabilityRecoveryIntervalMs = 5_000
const availabilityRecoveryMaxDurationMs = 5 * 60 * 1_000

export function BillingPage({ mode = 'light', buyerEmail = '', onBalanceChanged }: { mode?: PaletteMode; buyerEmail?: string; onBalanceChanged?: () => void | Promise<void> }) {
  const billing = useRechargeAccount()
  const publicConfig = useBillingPublicConfig()
  const history = useRechargeHistory()
  const products = useRechargeProducts(billing.account?.topup.allowed === true)
  const refreshAccount = billing.refresh
  const refreshPublicConfig = publicConfig.refresh
  const refreshProducts = products.refresh
  const refreshHistory = history.refresh
  const [trackedOrderID, setTrackedOrderID] = useState<string | null>(null)
  const [createdHereOrderID, setCreatedHereOrderID] = useState<string | null>(null)
  const [canceledOrderID, setCanceledOrderID] = useState<string | null>(null)
  const accountOrderIDSnapshot = billing.account?.topup.activeOrderId ?? null
  const accountOrderID = accountOrderIDSnapshot === canceledOrderID ? null : accountOrderIDSnapshot
  const orderID = trackedOrderID ?? accountOrderID
  const polling = useTopupOrderPolling(orderID)
  const refreshedSettlement = useRef('')
  const availabilityRecoveryStartedAt = useRef<number | null>(null)
  const availabilityRecoveryInFlight = useRef(false)
  const decision = polling.status === null ? 'continue' : billingTopupPollingDecision(polling.status)
  const loading = billing.loading || publicConfig.loading || products.loading || history.loading || polling.loading
  const localCheckoutActive = createdHereOrderID !== null && createdHereOrderID === orderID && decision === 'continue'
  const resumableStripeOrderID = !localCheckoutActive && polling.status?.provider === 'stripe' &&
    polling.status.status === 'pending_payment' && polling.status.paymentStatus === 'waiting' && decision === 'continue'
    ? polling.status.id
    : null
  const canStartAnother = billing.fresh && billing.account?.topup.canCreateCheckout === true && accountOrderID === null &&
    polling.status?.status !== 'manual_review' && polling.status?.status !== 'underpaid' && polling.status?.status !== 'overpaid'
  const catalogHasPaymentMethod = products.items.some((product) => product.paymentMethods.tao || product.paymentMethods.stripe)
  const catalogUsesTAO = products.items.some((product) => product.paymentMethods.tao)
  const catalogUsesStripe = products.items.some((product) => product.paymentMethods.stripe)
  const availabilityRecoveryNeeded = billing.account?.topup.allowed === true && accountOrderID === null && (
    !billing.fresh || !publicConfig.fresh || !products.fresh || billing.account.topup.canCreateCheckout !== true ||
    !catalogHasPaymentMethod || (catalogUsesTAO && publicConfig.config?.tao.enabled !== true) ||
    (catalogUsesStripe && publicConfig.config?.stripe.enabled !== true)
  )
  const availabilityRecoveryIdle = !billing.loading && !publicConfig.loading && !products.loading
  const refreshAvailability = useCallback(async () => {
    if (availabilityRecoveryInFlight.current) return
    const startedAt = availabilityRecoveryStartedAt.current
    if (startedAt !== null && Date.now() - startedAt >= availabilityRecoveryMaxDurationMs) return
    availabilityRecoveryInFlight.current = true
    try {
      await Promise.allSettled([refreshAccount(), refreshPublicConfig(), refreshProducts()])
    } finally {
      availabilityRecoveryInFlight.current = false
    }
  }, [refreshAccount, refreshProducts, refreshPublicConfig])

  useEffect(() => {
    if (accountOrderID !== null && trackedOrderID === null) setTrackedOrderID(accountOrderID)
  }, [accountOrderID, trackedOrderID])

  useEffect(() => {
    if (canceledOrderID !== null && accountOrderIDSnapshot !== canceledOrderID) setCanceledOrderID(null)
  }, [accountOrderIDSnapshot, canceledOrderID])

  useEffect(() => {
    if (polling.status === null || billingTopupPollingDecision(polling.status) === 'continue') return
    const settlementKey = `${polling.status.id}:${polling.status.status}:${polling.status.credit?.ledgerEntryId ?? 'none'}:${polling.status.credit?.refundEntryId ?? 'none'}`
    if (refreshedSettlement.current === settlementKey) return
    refreshedSettlement.current = settlementKey
    void Promise.allSettled([
      refreshAccount(),
      refreshHistory(),
      Promise.resolve(onBalanceChanged?.()),
    ])
  }, [onBalanceChanged, polling.status, refreshAccount, refreshHistory])

  useEffect(() => {
    const expiredOrderID = polling.status?.status === 'expired' ? polling.status.id : null
    if (expiredOrderID === null || trackedOrderID !== expiredOrderID || !billing.fresh ||
        billing.account?.topup.activeOrderId !== null || billing.account?.topup.canCreateCheckout !== true) return
    setTrackedOrderID(null)
    setCreatedHereOrderID((current) => current === expiredOrderID ? null : current)
  }, [billing.account, billing.fresh, polling.status, trackedOrderID])

  useEffect(() => {
    if (!availabilityRecoveryNeeded) {
      availabilityRecoveryStartedAt.current = null
      availabilityRecoveryInFlight.current = false
      return
    }
    if (!availabilityRecoveryIdle) return
    const startedAt = availabilityRecoveryStartedAt.current ?? Date.now()
    availabilityRecoveryStartedAt.current = startedAt
    const remainingMs = availabilityRecoveryMaxDurationMs - (Date.now() - startedAt)
    if (remainingMs <= 0) return
    const timer = window.setTimeout(() => void refreshAvailability(), Math.min(availabilityRecoveryIntervalMs, remainingMs))
    return () => window.clearTimeout(timer)
  }, [availabilityRecoveryIdle, availabilityRecoveryNeeded, refreshAvailability])

  useEffect(() => {
    if (!availabilityRecoveryNeeded) return
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshAvailability()
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [availabilityRecoveryNeeded, refreshAvailability])

  const refresh = async () => {
    const requests: Promise<void>[] = [refreshAccount(), publicConfig.refresh(), refreshHistory()]
    if (billing.account?.topup.allowed) requests.push(products.refresh())
    if (orderID !== null) requests.push(polling.refresh())
    await Promise.all(requests)
  }

  const startAnother = () => {
    setTrackedOrderID(null)
    setCreatedHereOrderID(null)
    void Promise.all([refreshAccount(), products.refresh(), refreshHistory()])
  }

  const viewHistory = () => document.getElementById('recharge-history')?.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })

  return (
    <section
      id="cs-panel-billing"
      className={`logos-console-root cs-billing-root billing-page ${mode === 'dark' ? 'cs-night' : ''}`}
      data-logos-mode={mode}
      aria-labelledby="billing-page-title"
    >
      <header className="billing-page__header">
        <div>
          <span className="billing-eyebrow">{pageText('billing.billingPage.logosCredit')}</span>
          <h1 id="billing-page-title">{pageText('billing.billingPage.recharge')}</h1>
          <p>{pageText('billing.billingPage.viewYourAvailableUsdCreditAndAddMoreWith')}</p>
        </div>
        <div>
          <button className="cs-btn" type="button" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={loading ? 'billing-spin' : undefined} size={16} aria-hidden="true" />
            {loading ? pageText('billing.billingPage.refreshing') : pageText('billing.billingPage.refresh')}
          </button>
        </div>
      </header>

      {billing.error ? (
        <section className="billing-recovery billing-recovery-summary" role="alert" aria-labelledby="recharge-recovery-title">
          <h2 id="recharge-recovery-title">{pageText('billing.billingPage.currentCreditCouldNotBeRefreshed')}</h2>
          <p>{billing.account === null ? pageText('billing.billingPage.rechargeActionsRemainUnavailableUntilTheServerResponseIs') : pageText('billing.billingPage.theLastVerifiedBalanceRemainsVisibleRechargeActionsStay')}</p>
          <p className="billing-inline-error">{billing.error}</p>
          <button className="cs-btn" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? pageText('billing.billingPage.retrying') : pageText('billing.billingPage.tryAgain')}</button>
        </section>
      ) : null}

      <RechargeOverview
        account={billing.account}
        available={billing.available}
        fresh={billing.fresh}
        loading={billing.loading}
        onRetry={() => void refreshAccount()}
      />
      {orderID !== null && !(polling.status?.creditStatus === 'credited' && polling.status.status === 'paid') ? <RechargeOrderStatus
        orderID={orderID}
        status={polling.status}
        error={polling.error}
        loading={polling.loading}
        canStartAnother={canStartAnother}
        onRefresh={() => void polling.refresh()}
        onStartAnother={startAnother}
      /> : null}
      {resumableStripeOrderID !== null ? (
        <section className="recharge-options cs-sec">
          <Suspense fallback={<div className="billing-loading" role="status">{pageText('billing.rechargeOptions.loadingSecureStripeCheckout')}</div>}>
            <StripeTopupResumeCheckout
              buyerEmail={buyerEmail}
              orderID={resumableStripeOrderID}
              onPendingVerification={() => void polling.refresh()}
            />
          </Suspense>
        </section>
      ) : null}
      {polling.status?.creditStatus === 'credited' && polling.status.status === 'paid' ? <RechargeSuccess
        status={polling.status}
        canStartAnother={canStartAnother}
        onStartAnother={startAnother}
        onViewHistory={viewHistory}
      /> : null}
      {billing.account?.topup.allowed && (orderID === null || localCheckoutActive) ? (
        <RechargeOptions
          buyerEmail={buyerEmail}
          products={products.items}
          available={products.available}
          fresh={products.fresh}
          loading={products.loading}
          error={products.error}
          canCreateCheckout={billing.account.topup.canCreateCheckout && billing.fresh}
          activeOrderId={orderID}
          taoWalletConfig={publicConfig.config?.tao ?? null}
          onRetry={() => void products.refresh()}
          onOrderCreated={(createdOrderID) => {
            setCanceledOrderID(null)
            setTrackedOrderID(createdOrderID)
            setCreatedHereOrderID(createdOrderID)
            void refreshAccount()
          }}
          onOrderCanceled={(canceledOrderID) => {
            setCanceledOrderID(canceledOrderID)
            setTrackedOrderID((current) => current === canceledOrderID ? null : current)
            setCreatedHereOrderID((current) => current === canceledOrderID ? null : current)
            void Promise.all([refreshAccount(), products.refresh(), refreshHistory()])
          }}
          onTransactionSubmitted={() => void polling.refresh()}
        />
      ) : null}
      <RechargeHistory
        history={history.history}
        available={history.available}
        fresh={history.fresh}
        loading={history.loading}
        error={history.error}
        onRetry={() => void refreshHistory()}
      />
    </section>
  )
}
