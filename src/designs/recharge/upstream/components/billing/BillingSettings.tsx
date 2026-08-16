import { useEffect, useRef, useState } from 'react'
import { CalendarClock, CreditCard, History, RefreshCw, ServerCog, ShieldCheck } from 'lucide-react'
import { apiErrorMessage } from '../../api'
import type { BillingCancellationResult } from '../../billingCancellation'
import { billingSettingsPresentation } from '../../billingSettingsPresentation'
import type { BillingAccount, BillingPlan } from '../../billingTypes'
import { formatDate, formatGibibytes } from '../../utils/format'
import { LogosDialog } from '../logos'
import { pageText } from '../../i18n/pageText'
import { billingPlanName } from '../../billingCatalogText'

function date(value: string) {
  return formatDate(value, { dateStyle: 'long' })
}

function DateValue({ value }: { value: string }) {
  return <time dateTime={value}>{date(value)}</time>
}

function gibibytes(value: number) {
  return formatGibibytes(value)
}

export function BillingSettings({ account, plans, available, fresh = true, loading, historyAvailable, onUpgrade, onHistory, onPortal, onCancel }: {
  account: BillingAccount | null
  plans: BillingPlan[]
  available: boolean
  fresh?: boolean
  loading: boolean
  historyAvailable: boolean
  onUpgrade: () => void
  onHistory: () => void
  onPortal: () => Promise<void>
  onCancel: (subscriptionID: string) => Promise<BillingCancellationResult>
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [cancelWorking, setCancelWorking] = useState(false)
  const [error, setError] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [cancellation, setCancellation] = useState<BillingCancellationResult | null>(null)
  const cancelTrigger = useRef<HTMLButtonElement | null>(null)
  const cancellationStatus = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (cancellation && account !== null && account.subscription?.id !== cancellation.subscriptionId) {
      setCancellation(null)
    }
  }, [account, cancellation])

  useEffect(() => {
    if (cancellation && !cancelOpen) cancellationStatus.current?.focus()
  }, [cancelOpen, cancellation])

  const run = async (action: () => Promise<void>) => {
    setWorking(true)
    setError('')
    try {
      await action()
    } catch (actionError) {
      setError(apiErrorMessage(actionError, pageText('dynamic.billing.actionFailed')))
    } finally {
      setWorking(false)
    }
  }

  if (loading && account === null) return (
    <section className="billing-empty" role="status" aria-live="polite">
      <RefreshCw className="billing-spin" size={28} aria-hidden="true" />
      <h2>{pageText('billing.billingSettings.loadingBillingSettings')}</h2>
      <p>{pageText('billing.billingSettings.checkingTheCurrentPlanEntitlementAndRenewalStateWith')}</p>
    </section>
  )
  if (!available || account === null) return (
    <section className="billing-empty billing-recovery" role="alert">
      <h2>{pageText('billing.billingSettings.accountBillingDataIsTemporarilyUnavailable')}</h2>
      <p>{pageText('billing.billingSettings.noSubscriptionChangesWereMadeRefreshBeforeTryingAn')}</p>
    </section>
  )

  const presentedAccount = cancellation && account.subscription?.id === cancellation.subscriptionId
    ? Object.freeze({
        ...account,
        subscription: Object.freeze({
          ...account.subscription,
          status: cancellation.status,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: cancellation.currentPeriodEnd,
        }),
        actions: Object.freeze({ ...account.actions, canCancel: false }),
      })
    : account
  const view = billingSettingsPresentation(presentedAccount, plans)
  if (view === null) return (
    <section className="billing-empty billing-recovery" role="alert">
      <h2>{pageText('billing.billingSettings.currentBillingStateCouldNotBeVerified')}</h2>
      <p>{pageText('billing.billingSettings.thePlanEntitlementAndSubscriptionEvidenceDoNotAgree')}</p>
    </section>
  )
  if (view.kind === 'free') return (
    <section className="billing-empty">
      <ShieldCheck size={30} aria-hidden="true" />
      <span className="billing-status-pill">{pageText('billing.billingSettings.free')}</span>
      <h2>{pageText('billing.billingSettings.startWithProWhenYouAreReady')}</h2>
      <p>{pageText('billing.billingSettings.yourTokenBalanceAndExistingInstanceLimitRemainSeparate')}</p>
      <div className="billing-empty__actions">
        <button type="button" disabled={!view.canPurchase || !fresh} onClick={onUpgrade}>{pageText('billing.billingSettings.compareProPlans')}</button>
        <button type="button" disabled={!historyAvailable} onClick={onHistory}><History size={16} aria-hidden="true" />{pageText('billing.billingSettings.viewBillingHistory')}</button>
      </div>
    </section>
  )

  const entitlement = view.entitlement
  const subscription = view.subscription
  const confirmedCancellation = cancellation && cancellation.subscriptionId === subscription?.id ? cancellation : null
  const cancellationScheduled = view.cancellationScheduled || confirmedCancellation !== null
  const cancellationPeriodEnd = confirmedCancellation
    ? confirmedCancellation.currentPeriodEnd
    : subscription?.currentPeriodEnd ?? null
  const delinquentCancellation = (confirmedCancellation
    ? confirmedCancellation.status
    : subscription?.status) === 'past_due'

  const confirmCancellation = async () => {
    if (!subscription || cancelWorking) return
    setCancelWorking(true)
    setCancelError('')
    try {
      const result = await onCancel(subscription.id)
      setCancellation(result)
      setCancelOpen(false)
    } catch (actionError) {
      setCancelError(apiErrorMessage(actionError, pageText('dynamic.billing.cancelRenewalFailed')))
    } finally {
      setCancelWorking(false)
    }
  }

  const restoreCancellationFocus = (event: Event) => {
    if (!cancelTrigger.current?.isConnected) return
    event.preventDefault()
    cancelTrigger.current.focus()
  }

  return (
    <div className="billing-settings">
      <section className="billing-current-plan" aria-labelledby="billing-current-plan-title">
        <div className="billing-current-plan__title">
          <span><ShieldCheck size={20} aria-hidden="true" /></span>
          <div><small>{view.kind === 'pending' ? pageText('billing.billingSettings.pendingPlan') : view.kind === 'scheduled' ? pageText('billing.billingSettings.scheduledPlan') : pageText('billing.billingSettings.currentPlan')}</small><h2 id="billing-current-plan-title">{view.plan ? billingPlanName(view.plan) : ''}</h2></div>
          <em className={`billing-status-pill billing-status-pill--${view.kind}`}>{view.statusLabel}</em>
        </div>
        <p className="billing-current-plan__status">{view.statusDetail}</p>
        <dl>
          <div><dt>{pageText('billing.billingSettings.entitlementStatus')}</dt><dd>{view.kind === 'pending' ? pageText('billing.billingSettings.notActiveYet') : entitlement?.status === 'scheduled' ? pageText('billing.billingSettings.scheduled2') : pageText('billing.billingSettings.active')}</dd></div>
          <div><dt>{pageText('billing.billingSettings.paymentProvider')}</dt><dd>{view.providerLabel}</dd></div>
          <div><dt>{pageText('billing.billingSettings.renewal')}</dt><dd>{view.renewalLabel}</dd></div>
          {subscription ? <div><dt>{pageText('billing.billingSettings.subscriptionStatus')}</dt><dd>{subscription.status.replace('_', ' ')}</dd></div> : null}
          {view.periodStart && view.periodEnd ? <div><dt>{view.periodLabel}</dt><dd><DateValue value={view.periodStart} /><span aria-hidden="true"> – </span><DateValue value={view.periodEnd} /></dd></div> : null}
          {view.nextDateLabel && view.nextDate ? <div><dt>{view.nextDateLabel}</dt><dd><DateValue value={view.nextDate} /></dd></div> : null}
        </dl>
        <p className="billing-renewal-note">{view.renewalDetail}</p>
        {view.graceEndsAt ? <p className="billing-warning" role="status"><CalendarClock size={16} aria-hidden="true" />{pageText('billing.billingSettings.paymentIsPastDueProRemainsAvailableUntil')} <DateValue value={view.graceEndsAt} />  {pageText('billing.billingSettings.whileStripeRecoveryCompletes')}</p> : null}
        {entitlement ? (
          <section className="billing-entitlement-policy" aria-labelledby="billing-entitlement-policy-title">
            <div><ServerCog size={18} aria-hidden="true" /><h3 id="billing-entitlement-policy-title">{pageText('billing.billingSettings.includedProResources')}</h3></div>
            <dl>
              <div><dt>{pageText('billing.billingSettings.activeInstances')}</dt><dd>{entitlement.policy.includedActiveInstances}</dd></div>
              <div><dt>{pageText('billing.billingSettings.cpuPerInstance')}</dt><dd>{entitlement.policy.cpuCoresPerInstance}  {pageText('billing.billingSettings.cores')}</dd></div>
              <div><dt>{pageText('billing.billingSettings.memoryPerInstance')}</dt><dd>{gibibytes(entitlement.policy.memoryBytesPerInstance)}</dd></div>
              <div><dt>{pageText('billing.billingSettings.workspacePerInstance')}</dt><dd>{gibibytes(entitlement.policy.workspaceBytesPerInstance)}</dd></div>
            </dl>
            <small>{pageText('billing.billingSettings.theseProResourcesRemainIndependentFromTokenBalanceAnd')}</small>
          </section>
        ) : null}
        {view.upcoming ? (
          <section className="billing-upcoming-term" aria-labelledby="billing-upcoming-title">
            <span className="billing-status-pill">{pageText('billing.billingSettings.nextTerm')}</span>
            <h3 id="billing-upcoming-title">{billingPlanName(view.upcoming.plan)}</h3>
            <p>{view.upcoming.providerLabel} · {view.upcoming.renewalLabel}</p>
            <p><DateValue value={view.upcoming.entitlement.startsAt} /><span aria-hidden="true"> – </span><DateValue value={view.upcoming.entitlement.expiresAt} /></p>
          </section>
        ) : null}
      </section>

      <section className="billing-actions-panel" aria-label={pageText('billing.billingSettings.billingActions')}>
        {view.showPaymentManagement ? <div><CreditCard size={20} aria-hidden="true" /><span><b>{pageText('billing.billingSettings.paymentAndInvoices')}</b><small>{view.canManagePaymentMethod ? pageText('billing.billingSettings.manageSavedMethodsAndInvoicesInTheSecureStripe') : pageText('billing.billingSettings.theSecureStripePortalIsNotAvailableForThis')}</small></span><button type="button" disabled={!fresh || !view.canManagePaymentMethod || working} onClick={() => void run(onPortal)}>{pageText('billing.billingSettings.managePayment')}</button></div> : null}
        <div><RefreshCw size={20} aria-hidden="true" /><span><b>{view.purchaseActionLabel}</b><small>{pageText('billing.billingSettings.chooseAServerPricedTermAndAnAvailablePayment')}</small></span><button type="button" disabled={!fresh || !view.canPurchase} onClick={onUpgrade}>{pageText('billing.billingSettings.viewPlans')}</button></div>
        <div><History size={20} aria-hidden="true" /><span><b>{pageText('billing.billingSettings.billingHistory')}</b><small>{pageText('billing.billingSettings.reviewPaymentsRefundsAndVerifiedTaoTransactionLinks')}</small></span><button type="button" disabled={!historyAvailable} onClick={onHistory}>{pageText('billing.billingSettings.viewHistory')}</button></div>
        {cancellationScheduled ? <div ref={cancellationStatus} className="billing-cancellation-confirmed" role={cancellation ? 'status' : undefined} aria-live={cancellation ? 'polite' : undefined} tabIndex={cancellation ? -1 : undefined}><CalendarClock size={20} aria-hidden="true" /><span><b>{pageText('billing.billingSettings.automaticRenewalIsCanceled')}</b><small>{delinquentCancellation ? pageText('billing.billingSettings.theCancellationIsScheduledStripePaymentRecoveryAndThe') : <>{pageText('billing.billingSettings.noFutureRenewalWillBeChargedProRemainsAvailable')} <DateValue value={cancellationPeriodEnd!} />.</>}</small></span><span className="billing-status-pill">{pageText('billing.billingSettings.scheduled')}</span></div> : null}
        {subscription?.provider === 'stripe' && view.canCancel && !cancellationScheduled ? <div><CalendarClock size={20} aria-hidden="true" /><span><b>{pageText('billing.billingSettings.cancelAutomaticRenewal')}</b><small>{subscription.status === 'past_due' ? pageText('billing.billingSettings.stopsFutureRenewalPaymentRecoveryAndTheGraceDeadline') : pageText('billing.billingSettings.accessRemainsActiveThroughThePaidPeriod')}</small></span><button ref={cancelTrigger} type="button" className="is-danger" disabled={!fresh || cancelWorking} onClick={() => { setCancelError(''); setCancelOpen(true) }}>{pageText('billing.billingSettings.cancelRenewal')}</button></div> : null}
      </section>
      {error ? <p className="billing-error" role="alert">{error}</p> : null}
      <LogosDialog open={cancelOpen} title={pageText('billing.billingSettings.cancelAutomaticRenewal2')} subtitle={subscription ? <>{pageText('billing.billingSettings.futureRenewalWillStopAfter')} <DateValue value={subscription.currentPeriodEnd} />.</> : undefined} onClose={() => { if (!cancelWorking) { setCancelOpen(false); setCancelError('') } }} onCloseAutoFocus={restoreCancellationFocus} actions={<><button type="button" disabled={cancelWorking} onClick={() => { setCancelOpen(false); setCancelError('') }}>{pageText('billing.billingSettings.keepSubscription')}</button><button type="button" className="billing-danger-button" disabled={cancelWorking} onClick={() => void confirmCancellation()}>{cancelWorking ? pageText('billing.billingSettings.canceling') : pageText('billing.billingSettings.cancelAtPeriodEnd')}</button></>}>
        <p>{subscription?.status === 'past_due' ? pageText('billing.billingSettings.thisStopsFutureAutomaticRenewalButDoesNotOverride') : pageText('billing.billingSettings.thisDoesNotIssueAnImmediateRefundOrRemove')}</p>
        <p>{pageText('billing.billingSettings.noImmediateCancellationRefundOrEntitlementRevocationWillBe')}</p>
        {cancelError ? <div className="billing-cancellation-error" role="alert"><b>{pageText('billing.billingSettings.cancellationWasNotConfirmed')}</b><span>{cancelError}</span><small>{pageText('billing.billingSettings.youCanRetrySafelyTheSameRequestKeyWill')}</small></div> : null}
      </LogosDialog>
    </div>
  )
}
