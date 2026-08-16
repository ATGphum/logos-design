import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  PaymentElement,
  useCheckoutElements,
} from './stripeShim' // DESIGN SHIM (was '@stripe/react-stripe-js/checkout')
import {
  loadStripe,
  type Stripe,
  type StripeCheckoutElementsSdkOptions,
  type StripeExpressCheckoutElementAvailablePaymentMethodsChangeEvent,
  type StripeExpressCheckoutElementConfirmEvent,
  type StripeExpressCheckoutElementReadyEvent,
} from './stripeShim' // DESIGN SHIM (was '@stripe/stripe-js')
import type {
  BillingStripeCheckoutSession,
  BillingStripePendingReference,
  BillingTopupProduct,
  StripeCheckoutPlanID,
} from '../../billingTypes'
import { useStripeCheckout } from '../../hooks/billing/useStripeCheckout'
import { useStripeTopupCheckout, useStripeTopupCheckoutResume } from '../../hooks/billing/useStripeTopupCheckout'
import './stripe-checkout.css'
import { pageText } from '../../i18n/pageText'

const stripeInstances = new Map<string, Promise<Stripe | null>>()

function stripeForPublishableKey(publishableKey: string) {
  const existing = stripeInstances.get(publishableKey)
  if (existing) return existing
  const created = Promise.resolve()
    .then(() => loadStripe(publishableKey))
    .catch((error) => {
      stripeInstances.delete(publishableKey)
      throw error
    })
  stripeInstances.set(publishableKey, created)
  return created
}

function safeStripeBuyerMessage(message: unknown, fallback = pageText('dynamic.billing.confirmationFailed')) {
  if (typeof message !== 'string') return fallback
  const normalized = message.trim()
  if (!normalized || normalized.length > 240 || /(?:client[_ -]?secret|\b[ps]k_(?:live|test)_|\bcs_(?:live|test)_)/i.test(normalized)) {
    return fallback
  }
  return normalized
}

function reportExpressFailure(event: StripeExpressCheckoutElementConfirmEvent, message: string) {
  try {
    event.paymentFailed({ reason: 'fail', message })
  } catch {
    // Stripe owns the payment sheet callback; the local error remains visible.
  }
}

function readyExpressMethods(event: StripeExpressCheckoutElementReadyEvent) {
  const methods = event.availablePaymentMethods
  if (!methods) return []
  return [
    methods.applePay && 'Apple Pay',
    methods.googlePay && 'Google Pay',
    methods.link && 'Link',
    methods.paypal && 'PayPal',
  ].filter((method): method is string => Boolean(method))
}

function changedExpressMethods(event: StripeExpressCheckoutElementAvailablePaymentMethodsChangeEvent) {
  const methods = event.paymentMethods
  if (!methods) return []
  return [
    methods.applePay?.available && 'Apple Pay',
    methods.googlePay?.available && 'Google Pay',
    methods.link?.available && 'Link',
    methods.paypal?.available && 'PayPal',
  ].filter((method): method is string => Boolean(method))
}

type StripePaymentFormProps = {
  buyerEmail?: string
  disabled: boolean
  paymentElementEnabled: boolean
  expressCheckoutEnabled: boolean
  purpose: 'pro' | 'topup'
  session: BillingStripeCheckoutSession
  onPendingVerification?: (reference: BillingStripePendingReference) => void
  onRestart: () => void
}

function StripePaymentForm({ buyerEmail, disabled, paymentElementEnabled, expressCheckoutEnabled, purpose, session, onPendingVerification, onRestart }: StripePaymentFormProps) {
  const checkoutState = useCheckoutElements()
  const confirmationLock = useRef(false)
  const [cardReady, setCardReady] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)
  const [expressMethods, setExpressMethods] = useState<string[] | null>(null)
  const [confirming, setConfirming] = useState<'card' | 'express' | null>(null)
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const markPending = () => {
    setPending(true)
    try {
      onPendingVerification?.({ orderId: session.orderId, subscriptionId: session.subscriptionId })
    } catch {
      // Consumer UI failures cannot turn a submitted payment into a retry.
    }
  }

  const submitCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || pending || confirmationLock.current || !cardReady || !cardComplete || checkoutState.type !== 'success') return
    confirmationLock.current = true
    setConfirming('card')
    setErrorMessage('')
    try {
      const pendingEmail = !checkoutState.checkout.email && buyerEmail ? { email: buyerEmail } : {}
      const result = await checkoutState.checkout.confirm({ redirect: 'always', ...pendingEmail })
      if (result.type === 'error') {
        setErrorMessage(safeStripeBuyerMessage(result.error.message, pageText('dynamic.billing.cardConfirmationFailed')))
        return
      }
      markPending()
    } catch (error) {
      setErrorMessage(safeStripeBuyerMessage(
        error instanceof Error ? error.message : error,
        pageText('billing.stripeCheckout.secureCardConfirmationIsTemporarilyUnavailablePleaseTryAgain'),
      ))
    } finally {
      confirmationLock.current = false
      setConfirming(null)
    }
  }

  const confirmExpress = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (disabled || pending || confirmationLock.current || checkoutState.type !== 'success') {
      reportExpressFailure(event, pageText('dynamic.billing.securePaymentNotReady'))
      return
    }
    confirmationLock.current = true
    setConfirming('express')
    setErrorMessage('')
    try {
      const pendingEmail = !checkoutState.checkout.email && buyerEmail ? { email: buyerEmail } : {}
      const result = await checkoutState.checkout.confirm({
        redirect: 'always',
        ...pendingEmail,
        expressCheckoutConfirmEvent: event,
      })
      if (result.type === 'error') {
        const message = safeStripeBuyerMessage(result.error.message)
        reportExpressFailure(event, message)
        setErrorMessage(message)
        return
      }
      markPending()
    } catch (error) {
      const message = safeStripeBuyerMessage(
        error instanceof Error ? error.message : error,
        pageText('dynamic.billing.expressPaymentUnavailable'),
      )
      reportExpressFailure(event, message)
      setErrorMessage(message)
    } finally {
      confirmationLock.current = false
      setConfirming(null)
    }
  }

  if (checkoutState.type === 'error') {
    return (
      <div className="billing-stripe-checkout__status" role="alert">
        <p>{pageText('billing.stripeCheckout.securePaymentComponentsCouldNotBeLoaded')}</p>
        <button type="button" onClick={onRestart}>{pageText('billing.stripeCheckout.startANewPayment')}</button>
      </div>
    )
  }

  if (pending) {
    return (
      <div className="billing-stripe-checkout__status" role="status" aria-live="polite">
        <strong>{pageText('billing.stripeCheckout.paymentSubmitted')}</strong>
        <p>{purpose === 'topup'
          ? pageText('billing.stripeCheckout.weAreWaitingForSecureServerConfirmationCreditIsAddedOnlyAfter')
          : pageText('billing.stripeCheckout.weAreWaitingForSecureServerConfirmationAccessWill')}</p>
      </div>
    )
  }

  const loading = checkoutState.type === 'loading'
  const cardLoading = loading || !cardReady
  const expressDisabled = disabled || loading || confirming !== null
  return (
    <div className="billing-stripe-checkout__form" aria-busy={loading || confirming !== null}>
      {expressCheckoutEnabled ? <section className="billing-stripe-checkout__express" aria-labelledby="billing-express-checkout-title">
        <h3 id="billing-express-checkout-title">{pageText('billing.stripeCheckout.expressCheckout')}</h3>
        <div
          className={expressDisabled
            ? 'billing-stripe-checkout__express-element billing-stripe-checkout__express-element--disabled'
            : 'billing-stripe-checkout__express-element'}
          aria-disabled={expressDisabled}
        >
          <ExpressCheckoutElement
            options={{
              buttonHeight: 48,
              buttonTheme: undefined,
              buttonType: undefined,
              layout: { maxColumns: 2, maxRows: 2, overflow: 'auto' },
              paymentMethodOrder: undefined,
              paymentMethods: {
                applePay: 'auto',
                googlePay: 'auto',
                link: 'auto',
                paypal: 'auto',
                amazonPay: 'never',
                klarna: 'never',
              },
            }}
            onReady={(event) => setExpressMethods(readyExpressMethods(event))}
            onAvailablePaymentMethodsChange={(event) => setExpressMethods(changedExpressMethods(event))}
            onConfirm={confirmExpress}
            onLoadError={() => setExpressMethods([])}
          />
        </div>
        {expressMethods === null ? (
          <p className="billing-stripe-checkout__hint" role="status">{pageText('billing.stripeCheckout.checkingAvailableExpressPaymentMethods')}</p>
        ) : expressMethods.length === 0 ? (
          <p className="billing-stripe-checkout__hint" role="status">{pageText('billing.stripeCheckout.noExpressPaymentMethodIsAvailableInThisBrowser')}{paymentElementEnabled ? pageText('billing.stripeCheckout.youCanStillPayByCard') : ''}</p>
        ) : (
          <p className="billing-stripe-checkout__hint" role="status">{pageText('billing.stripeCheckout.availableNow')} {expressMethods.join(', ')}.</p>
        )}
      </section> : null}

      {expressCheckoutEnabled && paymentElementEnabled ? <div className="billing-stripe-checkout__divider" role="separator"><span>{pageText('billing.stripeCheckout.orPayByCard')}</span></div> : null}

      {paymentElementEnabled ? <form className="billing-stripe-checkout__card" onSubmit={submitCard}>
        <PaymentElement
          options={{
            layout: 'accordion',
            paymentMethodOrder: ['card'],
            wallets: { applePay: 'never', googlePay: 'never', link: 'never' },
          }}
          onReady={() => setCardReady(true)}
          onChange={(event) => {
            setCardComplete(event.complete && event.value.type === 'card')
            if (event.complete && event.value.type === 'card') setErrorMessage('')
          }}
          onLoadError={() => setErrorMessage(pageText('billing.stripeCheckout.secureCardFieldsCouldNotBeLoadedStartA'))}
        />
        {cardLoading ? <p className="billing-stripe-checkout__hint" role="status">{pageText('billing.stripeCheckout.loadingSecureCardFields')}</p> : null}
        {errorMessage ? <p className="billing-stripe-checkout__error" role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={disabled || cardLoading || confirming !== null || !cardComplete}>
          {confirming === 'card' ? pageText('billing.stripeCheckout.confirmingSecurely') : pageText('billing.stripeCheckout.paySecurelyByCard')}
        </button>
      </form> : null}
      <p className="billing-stripe-checkout__hint">
        {purpose === 'topup'
          ? pageText('billing.stripeCheckout.paymentDetailsAreCollectedByStripeABrowserRedirectNeverAddsCredit')
          : pageText('billing.stripeCheckout.paymentDetailsAreCollectedByStripeABrowserRedirect')}
      </p>
    </div>
  )
}

export type StripeCheckoutProps = {
  planId: StripeCheckoutPlanID
  disabled?: boolean
  onPendingVerification?: (reference: BillingStripePendingReference) => void
}

export function StripeCheckout({ planId, disabled = false, onPendingVerification }: StripeCheckoutProps) {
  const { preparation, retry, startNewAttempt } = useStripeCheckout(planId)
  const [mountVersion, setMountVersion] = useState(1)

  if (preparation.phase === 'preparing') {
    return <div className="billing-stripe-checkout__status" role="status" aria-live="polite">{pageText('billing.stripeCheckout.preparingSecurePayment')}</div>
  }
  if (preparation.phase === 'error') {
    return (
      <div className="billing-stripe-checkout__status" role="alert">
        <p>{preparation.message}</p>
        <button type="button" onClick={preparation.canStartNewAttempt ? startNewAttempt : retry}>
          {preparation.canStartNewAttempt ? pageText('billing.stripeCheckout.startANewPayment2') : pageText('billing.stripeCheckout.tryAgain')}
        </button>
      </div>
    )
  }

  return (
    <StripePaymentProvider
      key={`${preparation.session.providerSessionId}:${preparation.attemptVersion}:${mountVersion}`}
      publishableKey={preparation.config.publishableKey}
      paymentElementEnabled={preparation.config.paymentElementEnabled}
      expressCheckoutEnabled={preparation.config.expressCheckoutEnabled}
      purpose="pro"
      session={preparation.session}
      disabled={disabled}
      onPendingVerification={onPendingVerification}
      onRestart={() => setMountVersion((current) => current + 1)}
    />
  )
}

export type StripeTopupCheckoutProps = {
  buyerEmail: string
  product: BillingTopupProduct
  disabled?: boolean
  onBack?: () => void
  onOrderCreated?: (orderID: string) => void
  onPendingVerification?: (reference: BillingStripePendingReference) => void
}

export function StripeTopupCheckout(props: StripeTopupCheckoutProps) {
  const normalizedEmail = props.buyerEmail.trim()
  if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) {
    return (
      <div className="billing-stripe-checkout__status" role="alert">
        <p>{pageText('billing.stripeCheckout.aValidAccountEmailIsRequiredBeforeASecureCard')}</p>
        {props.onBack ? <button type="button" onClick={props.onBack}>{pageText('billing.stripeCheckout.backToPaymentMethods')}</button> : null}
      </div>
    )
  }
  return <ReadyStripeTopupCheckout {...props} buyerEmail={normalizedEmail} />
}

function ReadyStripeTopupCheckout({ buyerEmail, product, disabled = false, onBack, onOrderCreated, onPendingVerification }: StripeTopupCheckoutProps) {
  const { preparation, retry } = useStripeTopupCheckout(product)
  const reportedOrderID = useRef<string | null>(null)
  const [mountVersion, setMountVersion] = useState(1)

  useEffect(() => {
    if (preparation.phase !== 'ready' || reportedOrderID.current === preparation.session.orderId) return
    reportedOrderID.current = preparation.session.orderId
    onOrderCreated?.(preparation.session.orderId)
  }, [onOrderCreated, preparation])

  if (preparation.phase === 'preparing') {
    return <div className="billing-stripe-checkout__status" role="status" aria-live="polite">{pageText('billing.stripeCheckout.preparingSecurePayment')}</div>
  }
  if (preparation.phase === 'error') {
    return (
      <div className="billing-stripe-checkout__status" role="alert">
        <p>{preparation.message}</p>
        <div>
          <button type="button" onClick={() => void retry()}>{pageText('billing.stripeCheckout.tryAgain')}</button>
          {onBack ? <button type="button" onClick={onBack}>{pageText('billing.stripeCheckout.backToPaymentMethods')}</button> : null}
        </div>
      </div>
    )
  }

  return (
    <StripePaymentProvider
      key={`${preparation.session.providerSessionId}:${preparation.attemptVersion}:${mountVersion}`}
      publishableKey={preparation.config.publishableKey}
      paymentElementEnabled={preparation.config.paymentElementEnabled}
      expressCheckoutEnabled={preparation.config.expressCheckoutEnabled}
      purpose="topup"
      buyerEmail={buyerEmail}
      session={preparation.session}
      disabled={disabled}
      onPendingVerification={onPendingVerification}
      onRestart={() => setMountVersion((current) => current + 1)}
    />
  )
}

export type StripeTopupResumeCheckoutProps = {
  buyerEmail: string
  orderID: string
  disabled?: boolean
  onPendingVerification?: (reference: BillingStripePendingReference) => void
}

export function StripeTopupResumeCheckout({ buyerEmail, orderID, disabled = false, onPendingVerification }: StripeTopupResumeCheckoutProps) {
  const normalizedEmail = buyerEmail.trim()
  if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) {
    return (
      <div className="billing-stripe-checkout__status" role="alert">
        <p>{pageText('billing.stripeCheckout.aValidAccountEmailIsRequiredBeforeASecureCard')}</p>
      </div>
    )
  }
  return <ReadyStripeTopupResumeCheckout buyerEmail={normalizedEmail} orderID={orderID} disabled={disabled} onPendingVerification={onPendingVerification} />
}

function ReadyStripeTopupResumeCheckout({ buyerEmail, orderID, disabled = false, onPendingVerification }: StripeTopupResumeCheckoutProps) {
  const { preparation, retry } = useStripeTopupCheckoutResume(orderID)
  const [mountVersion, setMountVersion] = useState(1)

  if (preparation.phase === 'preparing') {
    return <div className="billing-stripe-checkout__status" role="status" aria-live="polite">{pageText('billing.stripeCheckout.preparingSecurePayment')}</div>
  }
  if (preparation.phase === 'error') {
    return (
      <div className="billing-stripe-checkout__status" role="alert">
        <p>{preparation.message}</p>
        <button type="button" onClick={() => void retry()}>{pageText('billing.stripeCheckout.tryAgain')}</button>
      </div>
    )
  }

  return (
    <StripePaymentProvider
      key={`${preparation.session.providerSessionId}:${preparation.attemptVersion}:${mountVersion}`}
      publishableKey={preparation.config.publishableKey}
      paymentElementEnabled={preparation.config.paymentElementEnabled}
      expressCheckoutEnabled={preparation.config.expressCheckoutEnabled}
      purpose="topup"
      buyerEmail={buyerEmail}
      session={preparation.session}
      disabled={disabled}
      onPendingVerification={onPendingVerification}
      onRestart={() => setMountVersion((current) => current + 1)}
    />
  )
}

type StripePaymentProviderProps = StripePaymentFormProps & { publishableKey: string }

function StripePaymentProvider({ publishableKey, session, ...formProps }: StripePaymentProviderProps) {
  const [stripeState, setStripeState] = useState<
    | { phase: 'loading' }
    | { phase: 'ready'; stripe: Stripe }
    | { phase: 'error' }
  >({ phase: 'loading' })
  const options = useMemo<StripeCheckoutElementsSdkOptions>(() => ({
    clientSecret: session.clientSecret,
    elementsOptions: {
      loader: 'auto',
      savedPaymentMethod: { enableSave: 'never', enableRedisplay: 'auto' },
      appearance: {
        theme: 'stripe',
        variables: { colorPrimary: '#111111', borderRadius: '8px' },
      },
    },
  }), [session.clientSecret])

  useEffect(() => {
    let active = true
    setStripeState({ phase: 'loading' })
    stripeForPublishableKey(publishableKey).then((stripe) => {
      if (!active) return
      setStripeState(stripe === null ? { phase: 'error' } : { phase: 'ready', stripe })
    }).catch(() => {
      if (active) setStripeState({ phase: 'error' })
    })
    return () => {
      active = false
    }
  }, [publishableKey])

  if (stripeState.phase === 'loading') {
    return <div className="billing-stripe-checkout__status" role="status" aria-live="polite">{pageText('billing.stripeCheckout.loadingSecurePaymentComponents')}</div>
  }
  if (stripeState.phase === 'error') {
    return (
      <div className="billing-stripe-checkout__status" role="alert">
        <p>{pageText('billing.stripeCheckout.securePaymentComponentsCouldNotBeLoaded')}</p>
        <button type="button" onClick={formProps.onRestart}>{pageText('billing.stripeCheckout.reloadSecurePayment')}</button>
      </div>
    )
  }

  return (
    <CheckoutElementsProvider stripe={stripeState.stripe} options={options}>
      <StripePaymentForm session={session} {...formProps} />
    </CheckoutElementsProvider>
  )
}
