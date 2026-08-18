import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  cryptoDepositNextRefreshDelay,
  cryptoDepositRefreshOptions,
  useBillingPublicConfig,
  useCryptoDepositActivity,
  useCryptoDepositAddress,
  useCryptoDepositCatalog,
  useRechargeAccount,
  useRechargeHistory,
  useRechargeProducts,
  useTopupOrderPolling,
  type CryptoDepositRefreshOptions,
} from '../../hooks/billing'
import type { CryptoDepositFixture } from '../../depositTypes'
import { billingTopupPollingDecision } from '../../topupTypes'
import { AddCreditsDialog, type AddCreditsDialogStep } from './AddCreditsDialog'
import { CryptoDepositPanel, type CryptoDepositStep } from './CryptoDepositPanel'
import { RechargeHistory } from './RechargeHistory'
import { RechargeMethodPicker, type RechargeMethodAvailability } from './RechargeMethodPicker'
import { RechargeOverview } from './RechargeOverview'
import { RechargeOptions, type RechargeOptionsStep } from './RechargeOptions'
import { RechargeOrderStatus } from './RechargeOrderStatus'
import { RechargeSuccess } from './RechargeSuccess'
import './billing.css'
import { pageText } from '../../i18n/pageText'

const StripeTopupResumeCheckout = lazy(async () => {
  const module = await import('./StripeCheckout')
  return { default: module.StripeTopupResumeCheckout }
})

type PaletteMode = 'light' | 'dark'
type AddCreditsStep = 'method_picker' | RechargeOptionsStep | CryptoDepositStep

type BillingPageProps = {
  mode?: PaletteMode
  buyerEmail?: string
  onBalanceChanged?: () => void | Promise<void>
  /** A frozen source for isolated UI tests. null keeps production Deposit reads disabled after a fixture is removed. */
  cryptoDepositFixture?: CryptoDepositFixture | null
  /** Fixture-only timing override; production uses the frozen 60s/5s/10m policy. */
  cryptoDepositRefreshOptions?: Partial<CryptoDepositRefreshOptions>
}

const availabilityRecoveryIntervalMs = 5_000
const availabilityRecoveryMaxDurationMs = 5 * 60 * 1_000

function addCreditsDialogFlow(step: AddCreditsStep): {
  steps: readonly AddCreditsDialogStep[]
  activeStepIndex: number
} {
  const methodStep = { id: 'method', label: pageText('billing.rechargeMethodPicker.paymentMethods') }
  if (step === 'stripe_amount' || step === 'stripe_checkout') {
    return {
      steps: [
        methodStep,
        { id: 'amount', label: pageText('billing.rechargeOptions.rechargeAmount') },
        { id: 'checkout', label: pageText('billing.rechargeOptions.secureStripeCheckout') },
      ],
      activeStepIndex: step === 'stripe_amount' ? 1 : 2,
    }
  }
  if (step === 'crypto_selector' || step === 'crypto_address') {
    return {
      steps: [
        methodStep,
        { id: 'network', label: pageText('billing.cryptoDepositPanel.cryptoNetworkAndAsset') },
        { id: 'address', label: pageText('billing.cryptoDepositPanel.personalAddress') },
      ],
      activeStepIndex: step === 'crypto_selector' ? 1 : 2,
    }
  }
  return {
    steps: [
      methodStep,
      { id: 'details', label: pageText('billing.addCreditsDialog.paymentDetails') },
      { id: 'complete', label: pageText('billing.addCreditsDialog.complete') },
    ],
    activeStepIndex: 0,
  }
}

export function BillingPage({
  mode = 'light',
  buyerEmail = '',
  onBalanceChanged,
  cryptoDepositFixture,
  cryptoDepositRefreshOptions: depositRefreshOverrides,
}: BillingPageProps) {
  const billing = useRechargeAccount()
  const publicConfig = useBillingPublicConfig()
  const history = useRechargeHistory()
  const products = useRechargeProducts(billing.account?.topup.allowed === true)
  const refreshAccount = billing.refresh
  const refreshPublicConfig = publicConfig.refresh
  const refreshProducts = products.refresh
  const refreshHistory = history.refresh
  const productionCryptoEnabled = cryptoDepositFixture === undefined
  const cryptoCatalog = useCryptoDepositCatalog(productionCryptoEnabled)
  const cryptoAddress = useCryptoDepositAddress(cryptoCatalog.catalog, productionCryptoEnabled)
  const refreshAfterDepositCredit = useCallback(() => {
    void Promise.allSettled([
      refreshAccount(),
      refreshHistory(),
      Promise.resolve(onBalanceChanged?.()),
    ])
  }, [onBalanceChanged, refreshAccount, refreshHistory])
  const cryptoActivity = useCryptoDepositActivity(
    productionCryptoEnabled,
    cryptoCatalog.catalog,
    refreshAfterDepositCredit,
  )
  const pendingIntervalMs = depositRefreshOverrides?.pendingIntervalMs
  const pendingMaximumDurationMs = depositRefreshOverrides?.pendingMaximumDurationMs
  const regularIntervalMs = depositRefreshOverrides?.regularIntervalMs
  const depositRefreshPolicy = useMemo(() => cryptoDepositRefreshOptions({
    pendingIntervalMs,
    pendingMaximumDurationMs,
    regularIntervalMs,
  }), [
    pendingIntervalMs,
    pendingMaximumDurationMs,
    regularIntervalMs,
  ])
  const abortBillingReads = billing.abort
  const abortHistoryReads = history.abort
  const historyLoading = history.loading
  const cryptoCatalogData = cryptoCatalog.catalog
  const cryptoCatalogLoading = cryptoCatalog.loading
  const cryptoCatalogFresh = cryptoCatalog.fresh
  const cryptoCatalogError = cryptoCatalog.error
  const refreshCryptoCatalog = cryptoCatalog.refresh
  const abortCryptoCatalog = cryptoCatalog.abort
  const loadCryptoAddress = cryptoAddress.loadAddress
  const refreshCurrentCryptoAddress = cryptoAddress.refreshCurrent
  const abortCryptoAddress = cryptoAddress.abort
  const cryptoActivityLoading = cryptoActivity.loading
  const cryptoActivityNeedsShortPolling = cryptoActivity.needsShortPolling
  const refreshCryptoActivity = cryptoActivity.refresh
  const abortCryptoActivity = cryptoActivity.abort
  const cryptoDepositSource = useMemo<CryptoDepositFixture | null>(() => {
    if (cryptoDepositFixture !== undefined) return cryptoDepositFixture
    if (cryptoCatalogData === null) return null
    return Object.freeze({ catalog: cryptoCatalogData, loadAddress: loadCryptoAddress })
  }, [cryptoCatalogData, cryptoDepositFixture, loadCryptoAddress])
  const [trackedOrderID, setTrackedOrderID] = useState<string | null>(null)
  const [createdHereOrderID, setCreatedHereOrderID] = useState<string | null>(null)
  const [addCreditsOpen, setAddCreditsOpen] = useState(false)
  const [addCreditsStep, setAddCreditsStep] = useState<AddCreditsStep>('method_picker')
  const [depositRefreshCycle, setDepositRefreshCycle] = useState(0)
  const addCreditsTriggerRef = useRef<HTMLButtonElement>(null)
  const depositPendingStartedAt = useRef<number | null>(null)
  const depositImmediateTimer = useRef<number | null>(null)
  const accountOrderID = billing.account?.topup.activeOrderId ?? null
  const orderID = trackedOrderID ?? accountOrderID
  const polling = useTopupOrderPolling(orderID)
  const refreshedSettlement = useRef('')
  const availabilityRecoveryStartedAt = useRef<number | null>(null)
  const availabilityRecoveryInFlight = useRef(false)
  const decision = polling.status === null ? 'continue' : billingTopupPollingDecision(polling.status)
  const loading = billing.loading || publicConfig.loading || products.loading || historyLoading || polling.loading
  const localCheckoutActive = createdHereOrderID !== null && createdHereOrderID === orderID && decision === 'continue'
  const resumableStripeOrderID = !localCheckoutActive && polling.status?.provider === 'stripe' &&
    polling.status.status === 'pending_payment' && polling.status.paymentStatus === 'waiting' && decision === 'continue'
    ? polling.status.id
    : null
  const canStartAnother = billing.fresh && billing.account?.topup.canCreateCheckout === true && accountOrderID === null &&
    polling.status?.status !== 'manual_review' && polling.status?.status !== 'underpaid' && polling.status?.status !== 'overpaid'
  const catalogUsesStripe = products.items.some((product) => product.paymentMethods.stripe)
  const stripeMethodAvailability: RechargeMethodAvailability = (() => {
    if (billing.loading || publicConfig.loading || products.loading) {
      return { state: 'loading', detail: pageText('billing.rechargeMethodPicker.checkingStripeAvailability') }
    }
    if (orderID !== null || billing.account?.topup.canCreateCheckout !== true) {
      return { state: 'unavailable', detail: orderID !== null
        ? pageText('billing.rechargeMethodPicker.finishTheCurrentStripePaymentFirst')
        : pageText('billing.rechargeMethodPicker.stripeCheckoutIsNotAvailableForThisAccount') }
    }
    if (!billing.fresh || !publicConfig.fresh || !products.fresh || publicConfig.error || products.error) {
      return { state: 'unavailable', detail: pageText('billing.rechargeMethodPicker.stripeAvailabilityCouldNotBeVerified') }
    }
    if (publicConfig.config?.stripe.enabled !== true || !catalogUsesStripe) {
      return { state: 'unavailable', detail: pageText('billing.rechargeMethodPicker.stripeIsNotAvailableForTheVerifiedAmounts') }
    }
    return { state: 'available', detail: pageText('billing.rechargeMethodPicker.readyForAOneTimeUsdPayment') }
  })()
  const cryptoNetworks = cryptoDepositSource?.catalog.networks ?? []
  const readableCryptoNetworks = cryptoNetworks.filter((network) => network.availability.canReadAddress)
  const cryptoMethodAvailability: RechargeMethodAvailability = productionCryptoEnabled &&
    cryptoCatalogLoading && cryptoCatalogData === null
    ? { state: 'loading', detail: pageText('billing.rechargeMethodPicker.checkingCryptoAvailability') }
    : readableCryptoNetworks.length === 0
      ? { state: 'unavailable', detail: pageText('billing.rechargeMethodPicker.cryptoDepositDetailsAreNotAvailableYet') }
      : productionCryptoEnabled && (!cryptoCatalogFresh || cryptoCatalogError !== '') ||
          readableCryptoNetworks.some((network) => network.availability.reasonCode !== null || !network.availability.acceptingDeposits)
        ? { state: 'degraded', detail: pageText('billing.rechargeMethodPicker.cryptoAddressAvailableWithNetworkNotice') }
        : { state: 'available', detail: pageText('billing.rechargeMethodPicker.personalCryptoAddressIsReady') }
  const availabilityRecoveryNeeded = billing.account?.topup.allowed === true && accountOrderID === null && (
    !billing.fresh || !publicConfig.fresh || !products.fresh || billing.account.topup.canCreateCheckout !== true ||
    !catalogUsesStripe || publicConfig.config?.stripe.enabled !== true
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

  const abortDepositReads = useCallback(() => {
    abortBillingReads()
    abortHistoryReads()
    abortCryptoCatalog()
    abortCryptoAddress()
    abortCryptoActivity()
  }, [abortBillingReads, abortCryptoActivity, abortCryptoAddress, abortCryptoCatalog, abortHistoryReads])

  const refreshDepositResources = useCallback(async (includeDialogResources: boolean) => {
    const requests: Promise<unknown>[] = [refreshAccount(), refreshHistory(), refreshCryptoActivity()]
    if (includeDialogResources) {
      requests.push(refreshCryptoCatalog(), refreshCurrentCryptoAddress())
    }
    await Promise.allSettled(requests)
  }, [refreshAccount, refreshCryptoActivity, refreshCryptoCatalog, refreshCurrentCryptoAddress, refreshHistory])

  useEffect(() => {
    if (accountOrderID !== null && trackedOrderID === null) setTrackedOrderID(accountOrderID)
  }, [accountOrderID, trackedOrderID])

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
    if (!addCreditsOpen || orderID === null || decision === 'continue') return
    setAddCreditsOpen(false)
  }, [addCreditsOpen, decision, orderID])

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

  useEffect(() => {
    if (!productionCryptoEnabled) {
      depositPendingStartedAt.current = null
      return
    }
    if (cryptoActivityNeedsShortPolling) {
      depositPendingStartedAt.current ??= Date.now()
    } else {
      depositPendingStartedAt.current = null
    }
    setDepositRefreshCycle((current) => current + 1)
  }, [cryptoActivityNeedsShortPolling, productionCryptoEnabled])

  useEffect(() => {
    if (!productionCryptoEnabled || document.visibilityState === 'hidden' ||
        billing.loading || historyLoading || cryptoActivityLoading) return
    const pendingStartedAt = depositPendingStartedAt.current
    const delay = cryptoDepositNextRefreshDelay(
      cryptoActivityNeedsShortPolling,
      pendingStartedAt,
      Date.now(),
      depositRefreshPolicy,
    )
    const shortPolling = cryptoActivityNeedsShortPolling && pendingStartedAt !== null &&
      Date.now() - pendingStartedAt < depositRefreshPolicy.pendingMaximumDurationMs
    let settled = false
    const timer = window.setTimeout(() => {
      const request = shortPolling ? refreshCryptoActivity() : refreshDepositResources(false)
      void request.finally(() => {
        if (!settled) setDepositRefreshCycle((current) => current + 1)
      })
    }, delay)
    return () => {
      settled = true
      window.clearTimeout(timer)
    }
  }, [
    billing.loading,
    cryptoActivityLoading,
    cryptoActivityNeedsShortPolling,
    depositRefreshCycle,
    depositRefreshPolicy,
    historyLoading,
    productionCryptoEnabled,
    refreshCryptoActivity,
    refreshDepositResources,
  ])

  useEffect(() => {
    if (!productionCryptoEnabled) return
    const queueVisibleRefresh = () => {
      if (document.visibilityState !== 'visible' || depositImmediateTimer.current !== null) return
      depositImmediateTimer.current = window.setTimeout(() => {
        depositImmediateTimer.current = null
        void refreshDepositResources(true).finally(() => setDepositRefreshCycle((current) => current + 1))
      }, 0)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (depositImmediateTimer.current !== null) window.clearTimeout(depositImmediateTimer.current)
        depositImmediateTimer.current = null
        abortDepositReads()
        setDepositRefreshCycle((current) => current + 1)
        return
      }
      queueVisibleRefresh()
    }
    window.addEventListener('focus', queueVisibleRefresh)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', queueVisibleRefresh)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (depositImmediateTimer.current !== null) window.clearTimeout(depositImmediateTimer.current)
      depositImmediateTimer.current = null
    }
  }, [abortDepositReads, productionCryptoEnabled, refreshDepositResources])

  const refresh = async () => {
    const requests: Promise<void>[] = [refreshAccount(), publicConfig.refresh(), refreshHistory()]
    if (billing.account?.topup.allowed) requests.push(products.refresh())
    if (orderID !== null) requests.push(polling.refresh())
    if (productionCryptoEnabled && document.visibilityState === 'visible') {
      requests.push(refreshCryptoCatalog(), refreshCryptoActivity())
      if (addCreditsOpen && addCreditsStep === 'crypto_address') requests.push(refreshCurrentCryptoAddress())
    }
    await Promise.allSettled(requests)
  }

  const startAnother = () => {
    setTrackedOrderID(null)
    setCreatedHereOrderID(null)
    setAddCreditsStep('method_picker')
    setAddCreditsOpen(true)
    void Promise.all([refreshAccount(), products.refresh(), refreshHistory(), refreshCryptoCatalog()])
  }

  const viewHistory = () => document.getElementById('recharge-history')?.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })

  const openAddCredits = () => {
    setAddCreditsStep('method_picker')
    setAddCreditsOpen(true)
    if (productionCryptoEnabled) void refreshCryptoCatalog()
  }

  const addCreditsTitle = addCreditsStep === 'method_picker'
    ? pageText('billing.rechargeMethodPicker.chooseHowToAddCredits')
    : addCreditsStep === 'stripe_amount'
      ? pageText('billing.rechargeOptions.chooseRechargeAmount')
      : addCreditsStep === 'stripe_checkout'
        ? pageText('billing.rechargeOptions.secureStripeCheckout')
        : addCreditsStep === 'crypto_selector'
          ? pageText('billing.cryptoDepositPanel.chooseCryptoNetworkAndAsset')
          : pageText('billing.cryptoDepositPanel.yourCryptoDepositAddress')
  const addCreditsSubtitle = addCreditsStep === 'method_picker'
    ? pageText('billing.rechargeMethodPicker.stripeAndCryptoStayIndependentIfOneIsUnavailable')
    : addCreditsStep === 'stripe_amount'
      ? pageText('billing.rechargeOptions.enterAUsdAmountOrUseAQuickOption')
      : addCreditsStep === 'stripe_checkout'
        ? pageText('billing.rechargeOptions.completeYourPaymentInTheSecureStripeForm')
        : addCreditsStep === 'crypto_selector'
          ? pageText('billing.cryptoDepositPanel.selectNetworkAndNativeAsset')
          : pageText('billing.cryptoDepositPanel.sendOnlyTheSelectedAsset')
  const addCreditsFlow = addCreditsDialogFlow(addCreditsStep)

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
        addCreditsDisabled={!billing.account?.ledgerConfigured || (billing.account?.topup.allowed !== true && readableCryptoNetworks.length === 0)}
        addCreditsTriggerRef={addCreditsTriggerRef}
        onAddCredits={openAddCredits}
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
      <AddCreditsDialog
        open={addCreditsOpen}
        title={addCreditsTitle}
        subtitle={addCreditsSubtitle}
        steps={addCreditsFlow.steps}
        activeStepIndex={addCreditsFlow.activeStepIndex}
        returnFocusRef={addCreditsTriggerRef}
        onClose={() => {
          abortCryptoAddress()
          setAddCreditsOpen(false)
          setAddCreditsStep('method_picker')
        }}
      >
        {addCreditsStep === 'method_picker' ? (
          <RechargeMethodPicker
            stripe={stripeMethodAvailability}
            crypto={cryptoMethodAvailability}
            onSelectStripe={() => setAddCreditsStep('stripe_amount')}
            onSelectCrypto={cryptoDepositSource ? () => setAddCreditsStep('crypto_selector') : undefined}
          />
        ) : addCreditsStep === 'crypto_selector' || addCreditsStep === 'crypto_address' ? (
          cryptoDepositSource ? (
            <CryptoDepositPanel
              fixture={cryptoDepositSource}
              step={addCreditsStep}
              onBackToMethods={() => setAddCreditsStep('method_picker')}
              onStepChange={setAddCreditsStep}
            />
          ) : (
            <section className="crypto-deposit-panel crypto-deposit-panel--empty" role="alert">
              <strong>{pageText('billing.cryptoDepositPanel.catalogUnavailable')}</strong>
              <p>{pageText('billing.rechargeMethodPicker.cryptoDepositDetailsAreNotAvailableYet')}</p>
              <button className="cs-btn" type="button" onClick={() => setAddCreditsStep('method_picker')}>
                {pageText('billing.stripeCheckout.backToPaymentMethods')}
              </button>
            </section>
          )
        ) : billing.account?.topup.allowed ? (
          <RechargeOptions
            buyerEmail={buyerEmail}
            products={products.items}
            available={products.available}
            fresh={products.fresh}
            loading={products.loading}
            error={products.error}
            canCreateCheckout={billing.account.topup.canCreateCheckout && billing.fresh}
            activeOrderId={orderID}
            onBackToMethods={() => setAddCreditsStep('method_picker')}
            onStepChange={setAddCreditsStep}
            onRetry={() => void products.refresh()}
            onOrderCreated={(createdOrderID) => {
              setTrackedOrderID(createdOrderID)
              setCreatedHereOrderID(createdOrderID)
              void refreshAccount()
            }}
            onTransactionSubmitted={() => void polling.refresh()}
          />
        ) : null}
      </AddCreditsDialog>
      <RechargeHistory
        history={history.history}
        available={history.available}
        fresh={history.fresh}
        loading={history.loading}
        error={history.error}
        onRetry={() => void refreshHistory()}
        depositActivity={cryptoActivity.activity}
        depositAvailable={cryptoActivity.available}
        depositFresh={cryptoActivity.fresh}
        depositLoading={cryptoActivity.loading}
        depositError={cryptoActivity.error}
        onDepositRetry={() => void refreshCryptoActivity()}
        depositEnabled={productionCryptoEnabled}
      />
    </section>
  )
}
