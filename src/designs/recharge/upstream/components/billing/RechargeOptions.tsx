import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeDollarSign, Check, CreditCard, Orbit, RefreshCw } from 'lucide-react'
import { formatBillingCreditUSD, type BillingPaymentMethod, type BillingPublicConfig, type BillingTopupProduct } from '../../billingTypes'
import { pageText } from '../../i18n/pageText'
import { billingTopupProductName } from '../../billingCatalogText'

const TaoCheckout = lazy(async () => {
  const module = await import('./TaoCheckout')
  return { default: module.TaoCheckout }
})

const StripeTopupCheckout = lazy(async () => {
  const module = await import('./StripeCheckout')
  return { default: module.StripeTopupCheckout }
})

type RechargeOptionsProps = {
  buyerEmail: string
  products: readonly BillingTopupProduct[]
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
  canCreateCheckout: boolean
  activeOrderId: string | null
  taoWalletConfig: BillingPublicConfig['tao'] | null
  onRetry: () => void
  onOrderCreated?: (orderID: string) => void
  onOrderCanceled?: (orderID: string) => void
  onTransactionSubmitted?: (orderID: string) => void
}

function productPaymentAvailable(product: BillingTopupProduct) {
  return product.paymentMethods.tao || product.paymentMethods.stripe
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
      error: pageText('dynamic.billing.amountRange', { minimum: formatBillingCreditUSD(product.customAmount.minMicros), maximum: formatBillingCreditUSD(product.customAmount.maxMicros) }),
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

export function RechargeOptions({ buyerEmail, products, available, fresh, loading, error, canCreateCheckout, activeOrderId, taoWalletConfig, onRetry, onOrderCreated, onOrderCanceled, onTransactionSubmitted }: RechargeOptionsProps) {
  const [method, setMethod] = useState<BillingPaymentMethod | null>(null)
  const [checkoutProduct, setCheckoutProduct] = useState<BillingTopupProduct | null>(null)
  const [checkoutMethod, setCheckoutMethod] = useState<BillingPaymentMethod | null>(null)
  const [checkoutOrderID, setCheckoutOrderID] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const restoreCheckoutFocus = useRef(false)
  const amountInitialized = useRef(false)
  const checkoutButtonRef = useRef<HTMLButtonElement>(null)
  const customTemplate = useMemo(() => products.find((product) => product.customAmount.enabled) ?? null, [products])
  const quickProducts = useMemo(() => products.filter((product) => !product.customAmount.enabled).slice(0, 3), [products])
  const customSelection = useMemo(() => customAmountProduct(customTemplate, customAmount), [customAmount, customTemplate])
  const selectedProduct = customSelection.product
  const selectionEnabled = fresh && canCreateCheckout && activeOrderId === null && checkoutProduct === null
  const amountEnabled = selectionEnabled && customTemplate !== null

  useEffect(() => {
    if (amountInitialized.current || customTemplate === null) return
    setCustomAmount(quickProducts[0]?.displayAmount ?? customTemplate.displayAmount)
    amountInitialized.current = true
  }, [customTemplate, quickProducts])

  useEffect(() => {
    if (!fresh && checkoutProduct !== null && checkoutOrderID === null) setCheckoutProduct(null)
  }, [checkoutOrderID, checkoutProduct, fresh])

  useEffect(() => {
    if (selectedProduct?.paymentMethods.tao) {
      setMethod('tao')
    } else if (selectedProduct?.paymentMethods.stripe) {
      setMethod('stripe')
    } else {
      setMethod(null)
    }
  }, [selectedProduct])

  useEffect(() => {
    if (checkoutProduct !== null || !restoreCheckoutFocus.current) return
    restoreCheckoutFocus.current = false
    checkoutButtonRef.current?.focus()
  }, [checkoutProduct])

  if (!available) {
    return (
      <section className="billing-empty recharge-options-empty cs-sec" aria-busy={loading} aria-live="polite">
        {loading ? <RefreshCw className="billing-spin" size={28} aria-hidden="true" /> : <BadgeDollarSign size={28} aria-hidden="true" />}
        <h2>{loading ? pageText('billing.rechargeOptions.loadingRechargeAmounts') : pageText('billing.rechargeOptions.rechargeAmountsAreUnavailable')}</h2>
        <p>{loading ? pageText('billing.rechargeOptions.verifyingServerDefinedAmountsAndPaymentAvailability') : error || pageText('billing.rechargeOptions.noPaymentAmountCanBeSelectedUntilTheServer')}</p>
        {!loading ? <button className="cs-btn" type="button" onClick={onRetry}>{pageText('billing.rechargeOptions.tryAgain')}</button> : null}
      </section>
    )
  }

  return (
    <section className="recharge-options cs-sec" aria-labelledby="recharge-options-title">
      <div className="recharge-options__header">
        <div>
          <small>{pageText('billing.rechargeOptions.serverVerifiedAmounts')}</small>
          <h2 id="recharge-options-title">{pageText('billing.rechargeOptions.chooseRechargeAmount')}</h2>
          <p>{pageText('billing.rechargeOptions.enterAUsdAmountOrUseAQuickOption')}</p>
        </div>
        <span className={`billing-status-pill billing-status-pill--${fresh ? 'active' : 'pending'}`}>{fresh ? pageText('billing.rechargeOptions.verified') : pageText('billing.rechargeOptions.lastVerified')}</span>
      </div>

      {error ? <p className="billing-inline-error" role="alert">{error}  {pageText('billing.rechargeOptions.selectionIsDisabledUntilRefreshSucceeds')}</p> : null}
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
          <small>{selectedProduct ? `You receive ${formatBillingCreditUSD(selectedProduct.creditedMicros)} credit.` : pageText('billing.rechargeOptions.enterTheAmountYouWantToAdd')}</small>
          {customTemplate ? <small>{pageText('billing.rechargeOptions.allowed')} {formatBillingCreditUSD(customTemplate.customAmount.minMicros)}–{formatBillingCreditUSD(customTemplate.customAmount.maxMicros)}</small> : null}
        </div>
        {customTemplate === null ? <p className="billing-inline-error" role="alert">{pageText('billing.rechargeOptions.customRechargeIsNotAvailableInTheVerifiedServer')}</p> : customSelection.error ? <p className="billing-inline-error" role="alert">{customSelection.error}</p> : null}
      </div>

      <fieldset className="recharge-methods" disabled={!selectionEnabled || selectedProduct === null}>
        <legend>{pageText('billing.rechargeOptions.paymentMethod')}</legend>
        <label className={!selectedProduct?.paymentMethods.tao ? 'is-disabled' : ''}>
          <input className="recharge-method__native" type="radio" name="topup-payment-method" value="tao" checked={method === 'tao'} disabled={!selectedProduct?.paymentMethods.tao} onChange={() => setMethod('tao')} />
          <span className="recharge-method__check" aria-hidden="true">{method === 'tao' ? <Check size={12} /> : null}</span>
          <span className="recharge-method__icon" aria-hidden="true"><Orbit size={19} /></span>
          <span><strong>{pageText('billing.rechargeOptions.payWithTao')}</strong><small>{taoWalletConfig?.walletTransferEnabled ? pageText('billing.rechargeOptions.browserWalletOrManualTransferOnBittensorMainnet') : pageText('billing.rechargeOptions.manualTransferOnBittensorMainnet')}</small></span>
          {!selectedProduct?.paymentMethods.tao ? <em>{pageText('billing.rechargeOptions.unavailable')}</em> : null}
        </label>
        <label className={!selectedProduct?.paymentMethods.stripe ? 'is-disabled' : ''}>
          <input className="recharge-method__native" type="radio" name="topup-payment-method" value="stripe" checked={method === 'stripe'} disabled={!selectedProduct?.paymentMethods.stripe} onChange={() => setMethod('stripe')} />
          <span className="recharge-method__check" aria-hidden="true">{method === 'stripe' ? <Check size={12} /> : null}</span>
          <span className="recharge-method__icon" aria-hidden="true"><CreditCard size={18} /></span>
          <span><strong>{pageText('billing.rechargeOptions.card')}</strong><small>{pageText('billing.rechargeOptions.stripeOneTimePayment')}</small></span>
          {!selectedProduct?.paymentMethods.stripe ? <em>{pageText('billing.rechargeOptions.unavailable2')}</em> : null}
        </label>
      </fieldset>

      {selectedProduct && method ? (
        <div className="recharge-selection" role="status" aria-live="polite">
          <Check size={19} aria-hidden="true" />
          <span><strong>{billingTopupProductName(selectedProduct)}  {pageText('billing.rechargeOptions.selected')}</strong><small>{pageText('billing.rechargeOptions.pay')} {formatBillingCreditUSD(selectedProduct.paidMicros)} {selectedProduct.currency}  {pageText('billing.rechargeOptions.with')} {method === 'tao' ? pageText('billing.rechargeOptions.tao') : pageText('billing.rechargeOptions.card2')}  {pageText('billing.rechargeOptions.andReceive')} {formatBillingCreditUSD(selectedProduct.creditedMicros)}  {pageText('billing.rechargeOptions.credit')}</small></span>
        </div>
      ) : (
        <div className="recharge-selection recharge-selection--unavailable" role="status">
          <BadgeDollarSign size={19} aria-hidden="true" />
          <span><strong>{pageText('billing.rechargeOptions.paymentSelectionUnavailable')}</strong><small>{activeOrderId
            ? pageText('billing.rechargeOptions.finishTheActivePaymentBeforeStartingAnother')
            : customTemplate === null
              ? pageText('billing.rechargeOptions.theVerifiedCatalogDoesNotIncludeCustomRecharge')
              : !canCreateCheckout || (selectedProduct !== null && !productPaymentAvailable(selectedProduct))
                ? pageText('billing.rechargeOptions.securePaymentIsTemporarilyUnavailableAvailabilityIsRefreshedAutomatically')
                : pageText('billing.rechargeOptions.enterAValidAmountToContinue')}</small></span>
        </div>
      )}
      {selectedProduct && method === 'tao' && checkoutProduct === null ? (
        <div className="recharge-checkout-action">
          <button className="cs-btn pri" ref={checkoutButtonRef} type="button" disabled={!selectionEnabled || !selectedProduct.paymentMethods.tao} onClick={() => {
            setCheckoutMethod('tao')
            setCheckoutProduct(selectedProduct)
          }}>
            {pageText('billing.rechargeOptions.continueWithTao')}
          </button>
          <small>{taoWalletConfig?.walletTransferEnabled ? pageText('billing.rechargeOptions.connectASupportedBrowserWalletOrEnterASender') : pageText('billing.rechargeOptions.youWillEnterTheSendingWalletAddressBeforeAn')}</small>
        </div>
      ) : null}
      {selectedProduct && method === 'stripe' && checkoutProduct === null ? (
        <div className="recharge-checkout-action">
          <button className="cs-btn pri" ref={checkoutButtonRef} type="button" disabled={!selectionEnabled || !selectedProduct.paymentMethods.stripe} onClick={() => {
            setCheckoutMethod('stripe')
            setCheckoutProduct(selectedProduct)
          }}>
            {pageText('billing.rechargeOptions.continueWithCard')}
          </button>
          <small>{pageText('billing.rechargeOptions.cardDetailsAndEligibleExpressMethodsAreCollectedSecurelyByStripe')}</small>
        </div>
      ) : null}
      {checkoutProduct !== null && checkoutMethod === 'tao' ? (
        <Suspense fallback={<div className="billing-loading" role="status">{pageText('billing.rechargeOptions.loadingSecureTaoCheckout')}</div>}>
          <TaoCheckout
            product={checkoutProduct}
            walletConfig={taoWalletConfig}
            onBack={checkoutOrderID === null ? () => {
              restoreCheckoutFocus.current = true
              setCheckoutProduct(null)
            } : undefined}
            onOrderCreated={(orderID) => {
              setCheckoutOrderID(orderID)
              onOrderCreated?.(orderID)
            }}
            onOrderCanceled={(orderID) => {
              setCheckoutOrderID((current) => current === orderID ? null : current)
              setCheckoutMethod(null)
              setCheckoutProduct(null)
              onOrderCanceled?.(orderID)
            }}
            onTransactionSubmitted={onTransactionSubmitted}
          />
        </Suspense>
      ) : null}
      {checkoutProduct !== null && checkoutMethod === 'stripe' ? (
        <Suspense fallback={<div className="billing-loading" role="status">{pageText('billing.rechargeOptions.loadingSecureStripeCheckout')}</div>}>
          <StripeTopupCheckout
            buyerEmail={buyerEmail}
            product={checkoutProduct}
            onBack={checkoutOrderID === null ? () => {
              restoreCheckoutFocus.current = true
              setCheckoutMethod(null)
              setCheckoutProduct(null)
            } : undefined}
            onOrderCreated={(orderID) => {
              setCheckoutOrderID(orderID)
              onOrderCreated?.(orderID)
            }}
            onPendingVerification={(reference) => onTransactionSubmitted?.(reference.orderId)}
          />
        </Suspense>
      ) : null}
    </section>
  )
}
