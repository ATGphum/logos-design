import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BadgeDollarSign, Check, RefreshCw } from 'lucide-react'
import { formatBillingCreditUSD, type BillingTopupProduct } from '../../billingTypes'
import { pageText } from '../../i18n/pageText'
import { billingTopupProductName } from '../../billingCatalogText'

const StripeTopupCheckout = lazy(async () => {
  const module = await import('./StripeCheckout')
  return { default: module.StripeTopupCheckout }
})

export type RechargeOptionsStep = 'stripe_amount' | 'stripe_checkout'

type RechargeOptionsProps = {
  buyerEmail: string
  products: readonly BillingTopupProduct[]
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
  canCreateCheckout: boolean
  activeOrderId: string | null
  onBackToMethods: () => void
  onStepChange: (step: RechargeOptionsStep) => void
  onRetry: () => void
  onOrderCreated?: (orderID: string) => void
  onTransactionSubmitted?: (orderID: string) => void
}

function customAmountProduct(product: BillingTopupProduct | null, input: string) {
  if (product === null || !product.customAmount.enabled) return { product, error: '' }
  if (input === '') return { product: null, error: pageText('dynamic.billing.enterAmount') }
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/.exec(input)
  if (input.length > 20 || match === null) return { product: null, error: pageText('dynamic.billing.invalidUsdAmount') }
  const micros = BigInt(match[1]) * 1_000_000n + BigInt((match[2] ?? '').padEnd(2, '0') || '0') * 10_000n
  const minimum = BigInt(product.customAmount.minMicros)
  const maximum = BigInt(product.customAmount.maxMicros)
  if (micros < minimum || micros > maximum) {
    return {
      product: null,
      error: pageText('dynamic.billing.amountRange', {
        minimum: formatBillingCreditUSD(product.customAmount.minMicros),
        maximum: formatBillingCreditUSD(product.customAmount.maxMicros),
      }),
    }
  }
  const whole = micros / 1_000_000n
  const cents = ((micros % 1_000_000n) / 10_000n).toString().padStart(2, '0')
  const displayAmount = `${whole}.${cents}`
  return {
    product: Object.freeze({
      ...product,
      name: `$${displayAmount} Credit`,
      paidMicros: micros.toString(),
      creditedMicros: micros.toString(),
      displayAmount,
    }),
    error: '',
  }
}

function quickAmountLabel(product: BillingTopupProduct) {
  return formatBillingCreditUSD(product.paidMicros).replace(/\.00$/, '')
}

export function RechargeOptions({
  buyerEmail,
  products,
  available,
  fresh,
  loading,
  error,
  canCreateCheckout,
  activeOrderId,
  onBackToMethods,
  onStepChange,
  onRetry,
  onOrderCreated,
  onTransactionSubmitted,
}: RechargeOptionsProps) {
  const [checkoutProduct, setCheckoutProduct] = useState<BillingTopupProduct | null>(null)
  const [checkoutOrderID, setCheckoutOrderID] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const restoreCheckoutFocus = useRef(false)
  const amountInitialized = useRef(false)
  const checkoutButtonRef = useRef<HTMLButtonElement>(null)
  const stripeProducts = useMemo(() => products.filter((product) => product.paymentMethods.stripe), [products])
  const customTemplate = useMemo(() => stripeProducts.find((product) => product.customAmount.enabled) ?? null, [stripeProducts])
  const quickProducts = useMemo(() => stripeProducts.filter((product) => !product.customAmount.enabled).slice(0, 3), [stripeProducts])
  const customSelection = useMemo(() => customAmountProduct(customTemplate, customAmount), [customAmount, customTemplate])
  const selectedProduct = customSelection.product
  const selectionEnabled = fresh && canCreateCheckout && activeOrderId === null && checkoutProduct === null
  const amountEnabled = selectionEnabled && customTemplate !== null

  const returnToAmount = useCallback(() => {
    restoreCheckoutFocus.current = true
    setCheckoutOrderID(null)
    setCheckoutProduct(null)
    onStepChange('stripe_amount')
  }, [onStepChange])

  useEffect(() => {
    if (amountInitialized.current || customTemplate === null) return
    setCustomAmount(quickProducts[0]?.displayAmount ?? customTemplate.displayAmount)
    amountInitialized.current = true
  }, [customTemplate, quickProducts])

  useEffect(() => {
    if (!fresh && checkoutProduct !== null && checkoutOrderID === null) returnToAmount()
  }, [checkoutOrderID, checkoutProduct, fresh, returnToAmount])

  useEffect(() => {
    if (checkoutProduct !== null || !restoreCheckoutFocus.current) return
    restoreCheckoutFocus.current = false
    checkoutButtonRef.current?.focus()
  }, [checkoutProduct])

  if (checkoutProduct !== null) {
    return (
      <section className="recharge-options recharge-options--stripe-checkout cs-sec" aria-label={pageText('billing.rechargeOptions.secureStripeCheckout')}>
        <div className="recharge-step-toolbar">
          {checkoutOrderID === null ? (
            <button className="recharge-step-back" type="button" onClick={returnToAmount}>
              <ArrowLeft size={17} aria-hidden="true" />
              {pageText('billing.rechargeOptions.backToAmount')}
            </button>
          ) : <span />}
          <span className="billing-status-pill billing-status-pill--active">{pageText('billing.rechargeOptions.stripe')}</span>
        </div>
        <div className="recharge-selection" role="status" aria-live="polite">
          <Check size={19} aria-hidden="true" />
          <span>
            <strong>{billingTopupProductName(checkoutProduct)}</strong>
            <small>{pageText('billing.rechargeOptions.payAmountWithStripe', { amount: formatBillingCreditUSD(checkoutProduct.paidMicros) })}</small>
          </span>
        </div>
        <Suspense fallback={<div className="billing-loading" role="status">{pageText('billing.rechargeOptions.loadingSecureStripeCheckout')}</div>}>
          <StripeTopupCheckout
            buyerEmail={buyerEmail}
            product={checkoutProduct}
            onBack={checkoutOrderID === null ? returnToAmount : undefined}
            onOrderCreated={(orderID) => {
              setCheckoutOrderID(orderID)
              onOrderCreated?.(orderID)
            }}
            onPendingVerification={(reference) => onTransactionSubmitted?.(reference.orderId)}
          />
        </Suspense>
      </section>
    )
  }

  if (!available) {
    return (
      <section className="billing-empty recharge-options-empty cs-sec" aria-busy={loading} aria-live="polite">
        {loading ? <RefreshCw className="billing-spin" size={28} aria-hidden="true" /> : <BadgeDollarSign size={28} aria-hidden="true" />}
        <h3>{loading ? pageText('billing.rechargeOptions.loadingRechargeAmounts') : pageText('billing.rechargeOptions.rechargeAmountsAreUnavailable')}</h3>
        <p>{loading ? pageText('billing.rechargeOptions.verifyingServerDefinedAmountsAndPaymentAvailability') : error || pageText('billing.rechargeOptions.noPaymentAmountCanBeSelectedUntilTheServer')}</p>
        <div className="recharge-options-empty__actions">
          <button className="cs-btn" type="button" onClick={onBackToMethods}>{pageText('billing.stripeCheckout.backToPaymentMethods')}</button>
          {!loading ? <button className="cs-btn" type="button" onClick={onRetry}>{pageText('billing.rechargeOptions.tryAgain')}</button> : null}
        </div>
      </section>
    )
  }

  return (
    <section className="recharge-options cs-sec" aria-label={pageText('billing.rechargeOptions.chooseRechargeAmount')}>
      <div className="recharge-step-toolbar">
        <button className="recharge-step-back" type="button" onClick={onBackToMethods}>
          <ArrowLeft size={17} aria-hidden="true" />
          {pageText('billing.stripeCheckout.backToPaymentMethods')}
        </button>
        <span className={`billing-status-pill billing-status-pill--${fresh ? 'active' : 'pending'}`}>{fresh ? pageText('billing.rechargeOptions.verified') : pageText('billing.rechargeOptions.lastVerified')}</span>
      </div>

      {error ? <p className="billing-inline-error" role="alert">{error} {pageText('billing.rechargeOptions.selectionIsDisabledUntilRefreshSucceeds')}</p> : null}
      <div className="recharge-amount">
        <div className="recharge-amount__quick" aria-label={pageText('billing.rechargeOptions.quickRechargeAmounts')}>
          <span>{pageText('billing.rechargeOptions.quickAmount')}</span>
          <div>
            {quickProducts.map((product) => (
              <button
                type="button"
                key={product.id}
                aria-label={pageText('billing.rechargeOptions.useAmount', { amount: formatBillingCreditUSD(product.paidMicros) })}
                aria-pressed={selectedProduct?.paidMicros === product.paidMicros}
                disabled={!amountEnabled}
                onClick={() => setCustomAmount(product.displayAmount)}
              >
                {quickAmountLabel(product)}
              </button>
            ))}
          </div>
        </div>
        <label htmlFor="recharge-amount"><strong>{pageText('billing.rechargeOptions.rechargeAmount')}</strong><small>{pageText('billing.rechargeOptions.usdUpToTwoDecimalPlaces')}</small></label>
        <div className={`recharge-amount__input ${customAmount !== '' && customSelection.error !== '' ? 'is-invalid' : ''}`}>
          <span aria-hidden="true">$</span>
          <input
            id="recharge-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="25.00"
            value={customAmount}
            disabled={!amountEnabled}
            aria-invalid={customAmount !== '' && customSelection.error !== ''}
            aria-describedby="recharge-amount-help"
            onChange={(event) => setCustomAmount(event.target.value)}
          />
          <em>{pageText('billing.rechargeOptions.usd')}</em>
        </div>
        <div className="recharge-amount__meta" id="recharge-amount-help">
          <small>{selectedProduct
            ? pageText('billing.rechargeOptions.youReceiveCredit', { amount: formatBillingCreditUSD(selectedProduct.creditedMicros) })
            : pageText('billing.rechargeOptions.enterTheAmountYouWantToAdd')}</small>
          {customTemplate ? <small>{pageText('billing.rechargeOptions.allowed')} {formatBillingCreditUSD(customTemplate.customAmount.minMicros)}–{formatBillingCreditUSD(customTemplate.customAmount.maxMicros)}</small> : null}
        </div>
        {customTemplate === null ? <p className="billing-inline-error" role="alert">{pageText('billing.rechargeOptions.customRechargeIsNotAvailableInTheVerifiedServer')}</p> : customSelection.error ? <p className="billing-inline-error" role="alert">{customSelection.error}</p> : null}
      </div>

      {selectedProduct ? (
        <div className="recharge-selection" role="status" aria-live="polite">
          <Check size={19} aria-hidden="true" />
          <span>
            <strong>{pageText('billing.rechargeOptions.stripeAmountSelected')}</strong>
            <small>{pageText('billing.rechargeOptions.payAmountWithStripeAndReceiveCredit', {
              amount: formatBillingCreditUSD(selectedProduct.paidMicros),
              credit: formatBillingCreditUSD(selectedProduct.creditedMicros),
            })}</small>
          </span>
        </div>
      ) : (
        <div className="recharge-selection recharge-selection--unavailable" role="status">
          <BadgeDollarSign size={19} aria-hidden="true" />
          <span><strong>{pageText('billing.rechargeOptions.paymentSelectionUnavailable')}</strong><small>{activeOrderId
            ? pageText('billing.rechargeOptions.finishTheActivePaymentBeforeStartingAnother')
            : customTemplate === null
              ? pageText('billing.rechargeOptions.theVerifiedCatalogDoesNotIncludeCustomRecharge')
              : !canCreateCheckout
                ? pageText('billing.rechargeOptions.securePaymentIsTemporarilyUnavailableAvailabilityIsRefreshedAutomatically')
                : pageText('billing.rechargeOptions.enterAValidAmountToContinue')}</small></span>
        </div>
      )}

      <div className="recharge-checkout-action">
        <button
          className="cs-btn pri"
          ref={checkoutButtonRef}
          type="button"
          disabled={!selectionEnabled || selectedProduct === null}
          onClick={() => {
            if (selectedProduct === null) return
            setCheckoutProduct(selectedProduct)
            onStepChange('stripe_checkout')
          }}
        >
          {pageText('billing.rechargeOptions.continueWithCard')}
        </button>
        <small>{pageText('billing.rechargeOptions.cardDetailsAndEligibleExpressMethodsAreCollectedSecurelyByStripe')}</small>
      </div>
    </section>
  )
}
