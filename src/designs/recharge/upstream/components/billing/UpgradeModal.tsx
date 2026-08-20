import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, CreditCard, LockKeyhole, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import { billingPaymentMethodAvailability } from '../../billingPaymentMethods'
import { billingSuccessPresentation } from '../../billingSuccessPresentation'
import type { BillingCheckoutPlanID, BillingOrderStatus, BillingPaymentMethod, BillingPlan, BillingPublicConfig, BillingStripePendingReference } from '../../billingTypes'
import { useBillingPolling } from '../../hooks/billing'
import { LogosDialog } from '../logos'
import { BillingStatus } from './BillingStatus'
import { BillingSuccess } from './BillingSuccess'
import { BillingPriceSummary } from './BillingPriceSummary'
import { PaymentMethodPicker } from './PaymentMethodPicker'
import { PlanCard } from './PlanCard'
import { StripeCheckout } from './StripeCheckout'
import { pageText } from '../../i18n/pageText'
import { billingPlanName } from '../../billingCatalogText'

type UpgradeModalProps = {
  open: boolean
  plans: BillingPlan[]
  config: BillingPublicConfig | null
  loading?: boolean
  error?: string
  initialPlanID?: BillingCheckoutPlanID | null
  initialStripeOrderID?: string | null
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  onRefresh: () => void
  onPaymentVerified: () => void
  onViewBilling: () => void
  onReturnToProduct: () => void
}

export function UpgradeModal({ open, plans, config, loading = false, error = '', initialPlanID = null, initialStripeOrderID = null, onClose, onCloseAutoFocus, onRefresh, onPaymentVerified, onViewBilling, onReturnToProduct }: UpgradeModalProps) {
  const defaultPlanID = useMemo(
    () => plans.find((plan) => plan.id === initialPlanID)?.id ?? plans.find((plan) => plan.id === 'pro_quarterly')?.id ?? plans[0]?.id ?? null,
    [initialPlanID, plans],
  )
  const [planID, setPlanID] = useState<BillingCheckoutPlanID | null>(null)
  const [method, setMethod] = useState<BillingPaymentMethod | null>(null)
  const [step, setStep] = useState<'select' | 'checkout'>('select')
  const [pending, setPending] = useState<BillingStripePendingReference | null>(null)
  const [verified, setVerified] = useState<BillingOrderStatus | null>(null)
  const [recoveryError, setRecoveryError] = useState('')
  const notifiedSuccess = useRef('')
  const polling = useBillingPolling(pending?.orderId ?? null, pending !== null)
  const recoveringStripe = initialStripeOrderID !== null && pending?.orderId === initialStripeOrderID
  const plan = plans.find((candidate) => candidate.id === planID)
  const methodAvailability = useMemo(() => plan ? billingPaymentMethodAvailability(plan, config) : null, [config, plan])
  const selectablePlan = useMemo(() => plan && methodAvailability ? {
    ...plan,
    paymentMethods: Object.freeze({
      stripe: methodAvailability.stripe.enabled,
    }),
  } : plan, [methodAvailability, plan])
  const selectedMethodEnabled = method !== null && Boolean(methodAvailability?.[method].enabled)

  const acceptVerified = useCallback((status: BillingOrderStatus) => {
    const candidatePlan = plans.find((candidate) => candidate.id === status.planId)
    if (!candidatePlan || billingSuccessPresentation(status, candidatePlan) === null) {
      setRecoveryError(pageText('billing.upgradeModal.verifiedAccessDetailsAreNotAvailableYetRefreshThe'))
      return
    }
    setRecoveryError('')
    setPlanID(status.planId)
    setVerified(status)
    const evidenceKey = `${status.id}:${status.entitlement?.id ?? ''}:${status.entitlementStatus}`
    if (notifiedSuccess.current !== evidenceKey) {
      notifiedSuccess.current = evidenceKey
      onPaymentVerified()
    }
  }, [onPaymentVerified, plans])

  useEffect(() => {
    if (!open) return
    if (initialStripeOrderID !== null) {
      setPlanID(null)
      setMethod('stripe')
      setStep('checkout')
      setPending({ orderId: initialStripeOrderID })
      setRecoveryError('')
      return
    }
    setPlanID(defaultPlanID)
  }, [defaultPlanID, initialStripeOrderID, open])

  useEffect(() => {
    if (step === 'select' && method && !methodAvailability?.[method].enabled) {
      setMethod(null)
      setPending(null)
    }
  }, [method, methodAvailability, step])

  useEffect(() => {
    const status = polling.status
    if (!status || !pending) return
    if (status.id !== pending.orderId) {
      setRecoveryError(pageText('billing.upgradeModal.theStripePaymentReferenceCouldNotBeVerifiedFor'))
      return
    }
    setRecoveryError('')
    setPlanID(status.planId)
    if (status.status === 'paid' && ['active', 'scheduled'].includes(status.entitlementStatus)) acceptVerified(status)
  }, [acceptVerified, pending, polling.status])

  const reset = () => {
    setStep('select')
    setPending(null)
    setVerified(null)
    setRecoveryError('')
    setMethod(null)
    setPlanID(null)
    notifiedSuccess.current = ''
  }

  const resetAndClose = () => {
    reset()
    onClose()
  }

  const startNewPayment = () => {
    setStep('select')
    setPending(null)
    setVerified(null)
    setRecoveryError('')
  }

  const completeSuccessAction = (action: () => void) => {
    reset()
    action()
  }

  const navigatePlans = (event: KeyboardEvent<HTMLDivElement>) => {
    const keyOffsets: Partial<Record<string, number>> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    }
    const offset = keyOffsets[event.key]
    if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return
    const cards = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
    const current = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[role="radio"]') : null
    const currentIndex = current ? cards.indexOf(current) : -1
    if (cards.length === 0 || currentIndex < 0) return
    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? cards.length - 1
        : (currentIndex + offset! + cards.length) % cards.length
    cards[nextIndex].focus()
    cards[nextIndex].click()
  }

  const verifiedPlan = verified ? plans.find((candidate) => candidate.id === verified.planId) : undefined
  if (verified && verifiedPlan) {
    return <LogosDialog open={open} title={pageText('billing.upgradeModal.upgradeComplete')} wide contentClassName="billing-dialog" onClose={resetAndClose} onCloseAutoFocus={onCloseAutoFocus}>
      <BillingSuccess status={verified} plan={verifiedPlan} onBilling={() => completeSuccessAction(onViewBilling)} onDone={() => completeSuccessAction(onReturnToProduct)} />
    </LogosDialog>
  }

  return (
    <LogosDialog
      open={open}
      title={step === 'select' ? pageText('billing.upgradeModal.upgradeToPro') : recoveringStripe ? pageText('billing.upgradeModal.verifyingStripePayment') : pageText('billing.upgradeModal.secureStripeCheckout')}
      subtitle={step === 'select' ? pageText('billing.upgradeModal.chooseAServerPricedTermProRemainsIndependentFrom') : plan ? billingPlanName(plan) : pageText('billing.upgradeModal.checkingYourPaymentWithTheServer')}
      wide
      contentClassName="billing-dialog"
      onClose={resetAndClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {step === 'select' ? (
        <div className="billing-upgrade">
          <div className="billing-upgrade__hero"><Sparkles size={22} /><span><b>{pageText('billing.upgradeModal.moreRoomToBuild')}</b><small>{pageText('billing.upgradeModal.proAddsInstanceAndResourceEntitlementsWithoutChangingYour')}</small></span></div>
          {loading && plans.length === 0 ? <div className="billing-loading" role="status">{pageText('billing.upgradeModal.loadingPlansFromTheServer')}</div> : null}
          {error ? <div className="billing-recovery" role="alert"><p>{error}</p><button type="button" onClick={onRefresh}>{pageText('billing.upgradeModal.tryAgain')}</button></div> : null}
          {plan ? (
            <>
              <div className="billing-plan-grid" role="radiogroup" aria-label={pageText('billing.upgradeModal.proPlan')} onKeyDown={navigatePlans}>
                {plans.map((candidate) => <PlanCard key={candidate.id} plan={candidate} selected={candidate.id === plan.id} onSelect={() => setPlanID(candidate.id)} />)}
              </div>
              <PaymentMethodPicker plan={plan} config={config} value={method} onChange={setMethod} />
              <BillingPriceSummary plan={selectablePlan ?? plan} method={method} />
              <section className="billing-payment-trust" aria-labelledby="billing-payment-trust-title">
                <div>
                  <ShieldCheck size={18} aria-hidden="true" />
                  <span><strong id="billing-payment-trust-title">{pageText('billing.upgradeModal.securePayment')}</strong><small>{pageText('billing.upgradeModal.paymentCredentialsAreHandledByStripe')}</small></span>
                </div>
                <div className="billing-payment-badges" aria-label={pageText('billing.upgradeModal.paymentCapabilities')}>
                  <span className={methodAvailability?.stripe.enabled && config?.stripe.paymentElementEnabled ? '' : 'is-disabled'}><CreditCard size={15} aria-hidden="true" />{pageText('billing.upgradeModal.cardViaStripe')}</span>
                  <span className={methodAvailability?.stripe.enabled && config?.stripe.expressCheckoutEnabled ? '' : 'is-disabled'}><WalletCards size={15} aria-hidden="true" />{pageText('billing.upgradeModal.expressCheckoutAfterContinue')}</span>
                </div>
                <small>{pageText('billing.upgradeModal.stripeDynamicallyDecidesWhetherApplePayGooglePayLink')}</small>
              </section>
              <details className="billing-purchase-policies">
                <summary>{pageText('billing.upgradeModal.termsPrivacyRefundCancellation')}</summary>
                <div>
                  <section><h4>{pageText('billing.upgradeModal.terms')}</h4><p>{pageText('billing.upgradeModal.youArePurchasingTheSelectedServerPricedProTerm')}</p></section>
                  <section><h4>{pageText('billing.upgradeModal.privacy')}</h4><p>{pageText('billing.upgradeModal.stripeElementsCollectsStripePaymentDetails')}</p></section>
                  <section><h4>{pageText('billing.upgradeModal.refundCancellation')}</h4><p>{pageText('billing.upgradeModal.v1CompleteRefundsRevokeTheRelatedProEntitlementAfter')}</p></section>
                </div>
              </details>
              <div className="billing-upgrade__actions"><span><LockKeyhole size={14} />{pageText('billing.upgradeModal.pricesAndEntitlementsComeFromTheServer')}</span><button type="button" disabled={!selectedMethodEnabled} onClick={() => { if (selectedMethodEnabled) setStep('checkout') }}>{pageText('billing.upgradeModal.continue')}<ArrowRight size={16} /></button></div>
            </>
          ) : null}
        </div>
      ) : method === 'stripe' && pending ? (
        <div className="billing-checkout-shell">
          <button className="billing-back" type="button" onClick={() => { setStep('select'); setPending(null); setVerified(null); setRecoveryError('') }}><ArrowLeft size={16} />{pageText('billing.upgradeModal.chooseAnotherPlanOrPaymentMethod')}</button>
          {plan ? <div className="billing-checkout-summary"><span className="billing-checkout-summary__plan"><small>{pageText('billing.upgradeModal.selectedPlan')}</small><strong>{billingPlanName(plan)}</strong></span><BillingPriceSummary plan={plan} method="stripe" compact /></div> : null}
          {recoveryError ? <div className="billing-recovery" role="alert"><p>{recoveryError}</p><button type="button" disabled={polling.loading} onClick={() => void polling.refresh()}>{polling.loading ? pageText('billing.upgradeModal.checking') : pageText('billing.upgradeModal.refreshOrder')}</button></div> : <BillingStatus status={polling.status} error={polling.error} loading={polling.loading} providerHint="stripe" onRefresh={() => void polling.refresh()} onStartNewAttempt={startNewPayment} />}
        </div>
      ) : plan && method ? (
        <div className="billing-checkout-shell">
          <button className="billing-back" type="button" onClick={() => { setStep('select'); setPending(null) }}><ArrowLeft size={16} />{pageText('billing.upgradeModal.changePlanOrPaymentMethod')}</button>
          <div className="billing-checkout-summary"><span className="billing-checkout-summary__plan"><small>{pageText('billing.upgradeModal.selectedPlan2')}</small><strong>{billingPlanName(plan)}</strong></span><BillingPriceSummary plan={selectablePlan ?? plan} method={method} compact /></div>
          {method === 'stripe' ? (
            <StripeCheckout planId={plan.id} onPendingVerification={(reference) => setPending(reference)} />
          ) : null}
        </div>
      ) : null}
    </LogosDialog>
  )
}
