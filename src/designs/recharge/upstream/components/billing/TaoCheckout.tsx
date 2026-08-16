import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, ChevronDown, Copy, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import QRCode from './qrcodeShim' // DESIGN SHIM (was 'qrcode')
import type { QRCodeToDataURLOptions } from './qrcodeShim' // DESIGN SHIM (was 'qrcode')
import { api, apiErrorCode, apiErrorMessage, apiErrorStatus } from '../../api'
import { formatBillingCreditUSD, type BillingPublicConfig, type BillingTopupProduct } from '../../billingTypes'
import {
  DedotTaoInjectedTransferClient,
  InjectedTaoWalletConnector,
  TaoWalletError,
  bittensorMainnetGenesisHash,
  canonicalTaoTransactionReference,
  parseTaoTransactionSubmission,
  taoWalletSources,
  useTaoCheckout,
  type ConnectedTaoWallet,
  type TaoTransactionReference,
  type TaoTransactionSubmission,
  type TaoWalletSource,
} from '../../hooks/billing'
import { pageText } from '../../i18n/pageText'

type CopyState = 'idle' | 'copying' | 'copied' | 'error'
type TaoQREncoder = (payload: string, options: QRCodeToDataURLOptions) => Promise<string>

const taoQRCodeOptions = Object.freeze({
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 196,
  color: Object.freeze({ dark: '#141310ff', light: '#ffffffff' }),
} as const satisfies QRCodeToDataURLOptions)

function remainingLabel(expiry: string, now: number) {
  const remaining = Math.max(0, Date.parse(expiry) - now)
  const seconds = Math.floor(remaining / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function defaultCopyText(value: string) {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
    return Promise.reject(new Error('clipboard unavailable'))
  }
  return navigator.clipboard.writeText(value)
}

function defaultQREncoder(payload: string, options: QRCodeToDataURLOptions) {
  return QRCode.toDataURL(payload, options)
}

function validQRCodeDataURL(value: string) {
  return value.length <= 1024 * 1024 && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
}

function taoWalletSourceLabel(source: TaoWalletSource) {
  return source === 'subwallet-js' ? 'SubWallet' : source === 'polkadot-js' ? 'Polkadot.js' : 'Talisman'
}

function compactTaoAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`
}

function CopyButton({ value, subject, copyText }: {
  value: string
  subject: string
  copyText: (value: string) => Promise<void>
}) {
  const [state, setState] = useState<CopyState>('idle')
  const feedbackID = useId()
  const generation = useRef(0)
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    generation.current += 1
    setState('idle')
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    resetTimer.current = null
    return () => {
      generation.current += 1
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    }
  }, [value])

  const copy = async () => {
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setState('copying')
    try {
      await copyText(value)
      if (generation.current !== requestGeneration) return
      setState('copied')
      resetTimer.current = window.setTimeout(() => {
        if (generation.current === requestGeneration) setState('idle')
        resetTimer.current = null
      }, 1_800)
    } catch {
      if (generation.current === requestGeneration) setState('error')
    }
  }

  const feedback = state === 'copied'
    ? pageText('billing.taoCheckout.subjectCopied', { subject })
    : state === 'error'
      ? pageText('billing.taoCheckout.subjectCopyFailed', { subject })
      : ''
  return (
    <span className="billing-copy-control">
      <button
        type="button"
        className="billing-copy"
        aria-label={pageText('billing.taoCheckout.copySubject', { subject })}
        aria-describedby={feedbackID}
        disabled={state === 'copying'}
        onClick={() => void copy()}
      >
        {state === 'copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        {state === 'copying' ? pageText('billing.taoCheckout.copying') : state === 'copied' ? pageText('billing.taoCheckout.copied') : state === 'error' ? pageText('billing.taoCheckout.retryCopy') : pageText('billing.taoCheckout.copy')}
      </button>
      <span id={feedbackID} className="billing-copy-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</span>
    </span>
  )
}

type TaoQRState =
  | Readonly<{ phase: 'idle' | 'loading' | 'error' }>
  | Readonly<{ phase: 'ready'; dataURL: string }>

type TaoCheckoutProps = {
  product: BillingTopupProduct
  walletConfig: BillingPublicConfig['tao'] | null
  walletConnector?: InjectedTaoWalletConnector
  copyText?: (value: string) => Promise<void>
  qrEncoder?: TaoQREncoder
  onBack?: () => void
  onOrderCreated?: (orderID: string) => void
  onOrderCanceled?: (orderID: string) => void
  onTransactionSubmitted?: (orderID: string) => void
}

export function TaoCheckout({
  product,
  walletConfig,
  walletConnector,
  copyText = defaultCopyText,
  qrEncoder = defaultQREncoder,
  onBack,
  onOrderCreated,
  onOrderCanceled,
  onTransactionSubmitted,
}: TaoCheckoutProps) {
  const { manualPreparation, prepareManualTransfer, retryManualTransfer, startNewManualAttempt, cancelManualTransfer } = useTaoCheckout(product)
  const walletTransferEnabled = walletConfig?.enabled === true && walletConfig.walletTransferEnabled
  const walletEndpoint = walletTransferEnabled ? walletConfig.browserPublicWssUrl : ''
  const defaultConnector = useMemo(() => new InjectedTaoWalletConnector(walletTransferEnabled
    ? { transferClient: new DedotTaoInjectedTransferClient(walletEndpoint) }
    : {}), [walletEndpoint, walletTransferEnabled])
  const connector = walletConnector ?? defaultConnector
  const availability = useMemo(() => connector.availability(), [connector])
  const [accounts, setAccounts] = useState<readonly ConnectedTaoWallet[]>([])
  const [selectedAccount, setSelectedAccount] = useState<ConnectedTaoWallet | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [sender, setSender] = useState('')
  const [walletError, setWalletError] = useState('')
  const [canceling, setCanceling] = useState(false)
  const [walletPayState, setWalletPayState] = useState<'ready' | 'awaiting_approval' | 'submitted' | 'uncertain'>('ready')
  const [reference, setReference] = useState('')
  const [attemptedReference, setAttemptedReference] = useState<TaoTransactionReference | null>(null)
  const [submission, setSubmission] = useState<TaoTransactionSubmission | null>(null)
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [qr, setQr] = useState<TaoQRState>({ phase: 'idle' })
  const announcedOrder = useRef<string | null>(null)
  const accountMenuRoot = useRef<HTMLDivElement>(null)
  const accountMenuTrigger = useRef<HTMLButtonElement>(null)
  const accountMenu = useRef<HTMLDivElement>(null)
  const accountLabelID = useId()
  const accountMenuID = useId()
  const instructions = manualPreparation.phase === 'awaiting_transfer' ? manualPreparation.instructions : null

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const unsubscribe = connector.subscribeAccounts((updated) => {
      setAccounts(updated)
      setSelectedAccount((current) => {
        if (current === null) return null
        const same = updated.find((candidate) => candidate.address === current.address && candidate.accountType === current.accountType)
        if (same !== undefined) return same
        setWalletError(pageText('billing.taoCheckout.theSelectedWalletAccountChangedTheExistingQuoteRemains'))
        return null
      })
    })
    return () => {
      unsubscribe()
      void connector.disconnect()
    }
  }, [connector])

  useEffect(() => {
    setWalletPayState('ready')
    setWalletError('')
  }, [instructions?.orderId])

  useEffect(() => {
    if (!accountMenuOpen) return
    const menu = accountMenu.current
    const selected = menu?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
    const first = menu?.querySelector<HTMLButtonElement>('[role="option"]')
    ;(selected ?? first)?.focus()

    const closeFromOutside = (event: PointerEvent) => {
      if (!accountMenuRoot.current?.contains(event.target as Node)) setAccountMenuOpen(false)
    }
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setAccountMenuOpen(false)
        accountMenuTrigger.current?.focus()
        return
      }
      if (event.key === 'Tab') {
        setAccountMenuOpen(false)
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      const options = Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
      if (options.length === 0) return
      event.preventDefault()
      const current = options.indexOf(document.activeElement as HTMLButtonElement)
      if (event.key === 'Home') options[0].focus()
      else if (event.key === 'End') options[options.length - 1].focus()
      else if (event.key === 'ArrowDown') options[(current + 1 + options.length) % options.length].focus()
      else options[(current - 1 + options.length) % options.length].focus()
    }

    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', handleKeys)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', handleKeys)
    }
  }, [accountMenuOpen])

  useEffect(() => {
    if (accounts.length === 0 || manualPreparation.phase === 'preparing') setAccountMenuOpen(false)
  }, [accounts.length, manualPreparation.phase])

  useEffect(() => {
    if (instructions === null || announcedOrder.current === instructions.orderId) return
    announcedOrder.current = instructions.orderId
    onOrderCreated?.(instructions.orderId)
  }, [instructions, onOrderCreated])

  useEffect(() => {
    if (instructions === null) {
      setQr({ phase: 'idle' })
      return
    }
    if (instructions.qrPayload !== instructions.recipientAddress) {
      setQr({ phase: 'error' })
      return
    }
    let current = true
    setQr({ phase: 'loading' })
    void qrEncoder(instructions.qrPayload, taoQRCodeOptions)
      .then((value) => {
        if (current) setQr(validQRCodeDataURL(value) ? { phase: 'ready', dataURL: value } : { phase: 'error' })
      })
      .catch(() => { if (current) setQr({ phase: 'error' }) })
    return () => { current = false }
  }, [instructions, qrEncoder])

  const prepare = (event: FormEvent) => {
    event.preventDefault()
    setSubmissionError('')
    void prepareManualTransfer(sender)
  }

  const connectWallet = async (source: TaoWalletSource) => {
    setWalletError('')
    try {
      const account = await connector.connect(source)
      setAccounts(connector.availableAccounts())
      setSelectedAccount(account)
      setSender(account.address)
    } catch (error) {
      setAccounts([])
      setSelectedAccount(null)
      setWalletError(apiErrorMessage(error, pageText('dynamic.billing.walletConnectionFailed')))
    }
  }

  const chooseAccount = (address: string) => {
    setWalletError('')
    try {
      const selected = connector.selectAccount(address)
      setSelectedAccount(selected)
      setSender(selected.address)
      setAccountMenuOpen(false)
      accountMenuTrigger.current?.focus()
    } catch (error) {
      setSelectedAccount(null)
      setWalletError(apiErrorMessage(error, pageText('dynamic.billing.walletAccountFailed')))
    }
  }

  const confirmWalletAccount = () => {
    if (selectedAccount === null) return
    setWalletError('')
    setWalletPayState('ready')
    void prepareManualTransfer(selectedAccount.address)
  }

  const beginNewQuote = () => {
    setReference('')
    setAttemptedReference(null)
    setSubmission(null)
    setSubmissionError('')
    setWalletPayState('ready')
    void startNewManualAttempt(sender)
  }

  const cancelWalletConfirmation = async () => {
    if (instructions === null || canceling || walletPayState !== 'ready') return
    const orderID = instructions.orderId
    setCanceling(true)
    setWalletError('')
    try {
      await cancelManualTransfer(orderID)
      setReference('')
      setAttemptedReference(null)
      setSubmission(null)
      setSubmissionError('')
      setWalletPayState('ready')
      announcedOrder.current = null
      onOrderCanceled?.(orderID)
    } catch (error) {
      const transferMayHaveStarted = apiErrorStatus(error) === 409 ||
        ['billing_order_conflict', 'invalid_state', 'invalid_state_transition'].includes(apiErrorCode(error))
      setWalletError(transferMayHaveStarted
        ? pageText('dynamic.billing.checkoutTransferMayExist')
        : apiErrorMessage(error, pageText('dynamic.billing.checkoutCancelFailed')))
    } finally {
      setCanceling(false)
    }
  }

  const payWithConnectedWallet = async () => {
    if (instructions === null || selectedAccount === null || selectedAccount.address !== instructions.senderAddress || !walletTransferEnabled) return
    setWalletError('')
    setSubmissionError('')
    setWalletPayState('awaiting_approval')
    try {
      const result = await connector.transfer({
        orderId: instructions.orderId,
        network: 'bittensor_mainnet',
        genesisHash: bittensorMainnetGenesisHash,
        senderAddress: instructions.senderAddress,
        recipientAddress: instructions.recipientAddress,
        amountRao: instructions.amountRao,
        quoteExpiresAt: instructions.quoteExpiresAt,
      })
      setWalletPayState('submitted')
      setReference(result.extrinsicHash)
      await submitCanonicalReference({ kind: 'extrinsic_hash', value: result.extrinsicHash })
    } catch (error) {
      if (error instanceof TaoWalletError && error.code === 'wallet_submission_failed') {
        setWalletPayState('uncertain')
        setWalletError(pageText('billing.taoCheckout.walletSubmissionIsUncertainDoNotSendASecond'))
        return
      }
      setWalletPayState('ready')
      setWalletError(apiErrorMessage(error, pageText('dynamic.billing.walletTransferFailed')))
    }
  }

  const submitCanonicalReference = async (transactionReference: TaoTransactionReference) => {
    if (instructions === null) return
    setAttemptedReference(transactionReference)
    setSubmitting(true)
    setSubmissionError('')
    try {
      const payload = await api<unknown>(`/billing/orders/${encodeURIComponent(instructions.orderId)}/tao-transaction`, {
        method: 'POST',
        body: { transactionReference, senderAddress: instructions.senderAddress },
      })
      const parsed = parseTaoTransactionSubmission(payload, {
        orderId: instructions.orderId,
        senderAddress: instructions.senderAddress,
        transactionReference,
      })
      if (parsed === null) throw new Error(pageText('dynamic.billing.transactionResponseUnverified'))
      setSubmission(parsed)
      onTransactionSubmitted?.(parsed.orderId)
    } catch (error) {
      setSubmissionError(apiErrorMessage(error, pageText('dynamic.billing.transactionReferenceFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  const submitReference = (event: FormEvent) => {
    event.preventDefault()
    const parsed = attemptedReference ?? canonicalTaoTransactionReference(reference)
    if (parsed === null) {
      setSubmissionError(pageText('billing.taoCheckout.enterA32ByteExtrinsicHashBlockIndexReference'))
      return
    }
    void submitCanonicalReference(parsed)
  }

  if (manualPreparation.phase === 'entering_sender' || manualPreparation.phase === 'preparing') {
    return (
      <section className="billing-tao recharge-tao-checkout" aria-labelledby="tao-checkout-title">
        <div className="billing-checkout-heading">
          <span>{pageText('billing.taoCheckout.tao')}</span>
          <div>
            <h3 id="tao-checkout-title">{pageText('billing.taoCheckout.payOnBittensorMainnet')}</h3>
            <p>{pageText('billing.taoCheckout.oneTimeRechargeReceive')} {formatBillingCreditUSD(product.creditedMicros)}  {pageText('billing.taoCheckout.creditAfterFinalizedVerification')}</p>
          </div>
        </div>
        <div className="recharge-tao-checkout__product">
          <span><small>{pageText('billing.taoCheckout.selectedAmount')}</small><strong>{formatBillingCreditUSD(product.paidMicros)} {product.currency}</strong></span>
          <span><small>{pageText('billing.taoCheckout.creditAfterVerification')}</small><strong>{formatBillingCreditUSD(product.creditedMicros)}</strong></span>
        </div>
        {walletTransferEnabled ? (
          <div className="billing-wallet-options">
            <h4><WalletCards size={18} aria-hidden="true" />{pageText('billing.taoCheckout.connectBrowserWallet')}</h4>
            <div>
              {taoWalletSources.map((source) => (
                <button type="button" key={source} disabled={!availability[source] || manualPreparation.phase === 'preparing'} onClick={() => void connectWallet(source)}>
                  {taoWalletSourceLabel(source)}
                  {!availability[source] ? <small>{pageText('billing.taoCheckout.notDetected')}</small> : null}
                </button>
              ))}
            </div>
            <p className="billing-inline-note">{pageText('billing.taoCheckout.connectingOnlyReadsPublicAccountsLogosNeverRequestsYour')}</p>
            {accounts.length > 0 ? (
              <fieldset className="billing-wallet-accounts">
                <legend>{pageText('billing.taoCheckout.chooseTheBittensorAccountThatWillPay')}</legend>
                <div className="billing-wallet-account-select" role="group" aria-labelledby={accountLabelID}>
                  <span id={accountLabelID}>{pageText('billing.taoCheckout.account')}</span>
                  <div ref={accountMenuRoot} className={`billing-wallet-account-dropdown ${accountMenuOpen ? 'is-open' : ''}`}>
                    <button
                      ref={accountMenuTrigger}
                      className="billing-wallet-account-trigger"
                      type="button"
                      role="combobox"
                      aria-label={pageText('billing.taoCheckout.bittensorAccount')}
                      aria-haspopup="listbox"
                      aria-expanded={accountMenuOpen}
                      aria-controls={accountMenuOpen ? accountMenuID : undefined}
                      data-value={selectedAccount?.address ?? ''}
                      disabled={manualPreparation.phase === 'preparing'}
                      onClick={() => setAccountMenuOpen((current) => !current)}
                      onKeyDown={(event) => {
                        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
                        event.preventDefault()
                        setAccountMenuOpen(true)
                      }}
                    >
                      <WalletCards size={17} aria-hidden="true" />
                      <span>
                        <b>{selectedAccount?.accountName ?? pageText('billing.taoCheckout.selectAnAccount')}</b>
                        <small>{selectedAccount ? `${taoWalletSourceLabel(selectedAccount.source)} · ${compactTaoAddress(selectedAccount.address)}` : pageText('billing.taoCheckout.chooseAConnectedBittensorAccount')}</small>
                      </span>
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                    {accountMenuOpen ? (
                      <div ref={accountMenu} id={accountMenuID} className="billing-wallet-account-menu dashboard-scrollbar" role="listbox" aria-label={pageText('billing.taoCheckout.bittensorAccounts')}>
                        {accounts.map((account) => {
                          const selected = selectedAccount?.address === account.address
                          return (
                            <button
                              className={selected ? 'is-selected' : ''}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              data-value={account.address}
                              key={`${account.source}:${account.address}`}
                              tabIndex={selected ? 0 : -1}
                              onClick={() => chooseAccount(account.address)}
                            >
                              <span><b>{account.accountName ?? pageText('billing.taoCheckout.unnamedAccount')}</b><small>{taoWalletSourceLabel(account.source)} · {account.accountType}</small></span>
                              <code>{compactTaoAddress(account.address)}</code>
                              <Check size={15} aria-hidden="true" />
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
                {selectedAccount ? (
                  <div className="billing-wallet-account-details" aria-live="polite">
                    <span><b>{selectedAccount.accountName ?? pageText('billing.taoCheckout.unnamedAccount2')}</b><small>{taoWalletSourceLabel(selectedAccount.source)} · {selectedAccount.accountType}</small></span>
                    <code>{selectedAccount.address}</code>
                  </div>
                ) : null}
                <button type="button" disabled={selectedAccount === null || manualPreparation.phase === 'preparing'} onClick={confirmWalletAccount}>
                  {manualPreparation.phase === 'preparing' ? pageText('billing.taoCheckout.preparingQuote') : pageText('billing.taoCheckout.useThisAccount')}
                </button>
              </fieldset>
            ) : null}
            {walletError ? <p className="billing-error" role="alert">{walletError}</p> : null}
          </div>
        ) : null}
        {walletTransferEnabled ? <div className="billing-or"><span>{pageText('billing.taoCheckout.orPayFromAnotherWallet')}</span></div> : null}
        <form className="billing-sender-form" onSubmit={prepare}>
          <label>
            <span>{pageText('billing.taoCheckout.bittensorSenderAddressSs58Prefix42')}</span>
            <input value={sender} onChange={(event) => setSender(event.target.value)} autoComplete="off" spellCheck={false} placeholder="5…" />
          </label>
          <button type="submit" disabled={manualPreparation.phase === 'preparing'}>
            {manualPreparation.phase === 'preparing' ? pageText('billing.taoCheckout.preparingQuote2') : pageText('billing.taoCheckout.getExactTaoAmount')}
          </button>
        </form>
        <p className="billing-inline-note">{pageText('billing.taoCheckout.useTheAddressOfTheExternalWalletThatWill')}</p>
        {onBack ? <button className="billing-back" type="button" disabled={manualPreparation.phase === 'preparing'} onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />{pageText('billing.taoCheckout.changeAmount')}</button> : null}
      </section>
    )
  }

  if (manualPreparation.phase === 'error') {
    return (
      <section className="billing-tao billing-recovery recharge-tao-checkout" role="alert">
        <h3>{pageText('billing.taoCheckout.taoCheckoutNeedsAttention')}</h3>
        <p>{manualPreparation.message}</p>
        <div>
          {manualPreparation.canRetry ? <button type="button" onClick={() => void retryManualTransfer()}>{pageText('billing.taoCheckout.tryAgain')}</button> : null}
          {manualPreparation.canStartNewAttempt ? <button type="button" onClick={beginNewQuote}>{pageText('billing.taoCheckout.startANewQuote')}</button> : null}
        </div>
      </section>
    )
  }

  if (instructions === null) return null
  const expired = Date.parse(instructions.quoteExpiresAt) <= now
  const signingGuard = Date.parse(instructions.quoteExpiresAt) < now + 30_000
  const walletMatchesQuote = selectedAccount?.address === instructions.senderAddress
  const transferMayExist = attemptedReference !== null || submission !== null || walletPayState === 'submitted' || walletPayState === 'uncertain'
  return (
    <section className="billing-tao recharge-tao-checkout" aria-labelledby="tao-payment-title">
      <div className="billing-checkout-heading">
        <span>{pageText('billing.taoCheckout.tao2')}</span>
        <div><h3 id="tao-payment-title">{pageText('billing.taoCheckout.sendTheExactTaoAmount')}</h3><p>{pageText('billing.taoCheckout.order')} <code>{instructions.orderNo}</code>  {pageText('billing.taoCheckout.isBoundToYourSenderAddress')}</p></div>
      </div>
      <header className="billing-tao__summary">
        <div><span>{pageText('billing.taoCheckout.exactAmount')}</span><strong>{instructions.amountTao}  {pageText('billing.taoCheckout.tao3')}</strong><small>{instructions.amountRao}  {pageText('billing.taoCheckout.raoNetworkFeePaidSeparately')}</small></div>
        <div className={expired ? 'is-expired' : ''}><span>{pageText('billing.taoCheckout.quoteExpiresIn')}</span><strong>{remainingLabel(instructions.quoteExpiresAt, now)}</strong><button type="button" disabled={transferMayExist} onClick={beginNewQuote}><RefreshCw size={14} aria-hidden="true" />{transferMayExist ? pageText('billing.taoCheckout.existingTransferPending') : pageText('billing.taoCheckout.refreshQuote')}</button></div>
      </header>
      {expired ? <p className="billing-error" role="alert">{transferMayExist
        ? pageText('billing.taoCheckout.theQuoteTimerEndedAfterATransactionReferenceWas')
        : pageText('billing.taoCheckout.thisQuoteHasExpiredDoNotTransferItRefresh')}</p> : null}
      {walletTransferEnabled && walletMatchesQuote ? (
        <section className="billing-wallet-pay" aria-labelledby="tao-wallet-pay-title">
          <div className="billing-wallet-pay__details">
              <h4 id="tao-wallet-pay-title"><WalletCards size={18} aria-hidden="true" />{pageText('billing.taoCheckout.payWith')} {taoWalletSourceLabel(selectedAccount.source)}</h4>
            <p>{pageText('billing.taoCheckout.reviewTheCompleteRecipientAndExactRaoAmountIn')}</p>
            <code>{selectedAccount.address}</code>
          </div>
          <div className="billing-wallet-pay__actions">
            <button
              className="billing-wallet-pay__cancel"
              type="button"
              disabled={transferMayExist || walletPayState !== 'ready' || submitting || canceling}
              onClick={() => void cancelWalletConfirmation()}
            >
              {canceling ? pageText('billing.taoCheckout.canceling') : pageText('billing.taoCheckout.cancel')}
            </button>
            <button
              className="billing-wallet-pay__confirm"
              type="button"
              disabled={signingGuard || transferMayExist || walletPayState !== 'ready' || submitting || canceling}
              onClick={() => void payWithConnectedWallet()}
            >
              {walletPayState === 'awaiting_approval' ? pageText('billing.taoCheckout.waitingForWalletApproval') :
                walletPayState === 'submitted' ? pageText('billing.taoCheckout.transactionSubmitted') :
                  walletPayState === 'uncertain' ? pageText('billing.taoCheckout.checkExistingTransaction') : pageText('billing.taoCheckout.confirmAndPay')}
            </button>
          </div>
          {signingGuard && !expired && !transferMayExist ? <p className="billing-error" role="alert">{pageText('billing.taoCheckout.lessThan30SecondsRemainRefreshTheQuoteBefore')}</p> : null}
        </section>
      ) : walletTransferEnabled && selectedAccount !== null ? (
        <p className="billing-error" role="alert">{pageText('billing.taoCheckout.thisQuoteIsBoundToADifferentSenderDo')}</p>
      ) : null}
      <div className="billing-tao__transfer">
        <div className="billing-qr">
          {qr.phase === 'ready' ? <img src={qr.dataURL} width="196" height="196" alt={pageText('billing.taoCheckout.qrCodeContainingOnlyTheBittensorRecipientAddress')} /> : null}
          {qr.phase === 'loading' ? <span role="status">{pageText('billing.taoCheckout.generatingRecipientQr')}</span> : null}
          {qr.phase === 'error' ? <span className="billing-qr__error" role="alert">{pageText('billing.taoCheckout.qrUnavailableCopyTheFullRecipientAddress')}</span> : null}
          <small>{pageText('billing.taoCheckout.recipientOnlyVerifyTheFullAddressBelow')}</small>
        </div>
        <dl>
          <div><dt>{pageText('billing.taoCheckout.network')}</dt><dd>{instructions.networkLabel}</dd></div>
          <div><dt>{pageText('billing.taoCheckout.recipient')}</dt><dd><code>{instructions.recipientAddress}</code><CopyButton value={instructions.copy.recipientAddress} subject={pageText('billing.taoCheckout.recipientAddress')} copyText={copyText} /></dd></div>
          <div><dt>{pageText('billing.taoCheckout.boundSender')}</dt><dd><code>{instructions.senderAddress}</code></dd></div>
          <div><dt>{pageText('billing.taoCheckout.exactTaoAmount')}</dt><dd><code>{instructions.amountTao}  {pageText('billing.taoCheckout.tao4')}</code><CopyButton value={instructions.copy.amountTao} subject={pageText('billing.taoCheckout.exactTaoAmount')} copyText={copyText} /></dd></div>
          <div><dt>{pageText('billing.taoCheckout.integerRaoAmount')}</dt><dd><code>{instructions.amountRao}  {pageText('billing.taoCheckout.rao')}</code><CopyButton value={instructions.copy.amountRao} subject={pageText('billing.taoCheckout.integerRaoAmount')} copyText={copyText} /></dd></div>
          <div><dt>{pageText('billing.taoCheckout.creditAfterVerification2')}</dt><dd><code>{formatBillingCreditUSD(instructions.creditedMicros)}</code></dd></div>
          <div><dt>{pageText('billing.taoCheckout.order2')}</dt><dd><code>{instructions.orderNo}</code><CopyButton value={instructions.copy.orderNo} subject={pageText('billing.taoCheckout.orderNumber')} copyText={copyText} /></dd></div>
        </dl>
      </div>
      <div className="billing-tao__notice"><b>{pageText('billing.taoCheckout.sendOneExactTransferFromTheBoundSender')}</b><span>{pageText('billing.taoCheckout.theQrContainsOnlyTheRecipientAddressCopyThe')}</span></div>
      {walletError ? <p className="billing-error" role="alert">{walletError}</p> : null}
      <form className="billing-reference" onSubmit={submitReference}>
        <label>
          <span>{pageText('billing.taoCheckout.transactionHashBlockIndexOrApprovedExplorerUrl')}</span>
          <input value={reference} onChange={(event) => setReference(event.target.value)} disabled={attemptedReference !== null || submission !== null || submitting} placeholder={pageText('billing.taoCheckout.0xOr1234567')} autoComplete="off" spellCheck={false} />
        </label>
        <button type="submit" disabled={submission !== null || submitting || expired && attemptedReference === null}>
          {submitting ? pageText('billing.taoCheckout.submitting') : submission ? pageText('billing.taoCheckout.referenceSubmitted') : attemptedReference ? pageText('billing.taoCheckout.retrySameReference') : pageText('billing.taoCheckout.iHaveTransferredTao')}
        </button>
      </form>
      {submissionError ? <p className="billing-error" role="alert">{submissionError}</p> : null}
      {submission ? (
        <section className={`recharge-tao-submission recharge-tao-submission--${submission.verificationStatus}`} aria-live="polite">
          <ShieldCheck size={22} aria-hidden="true" />
          <span>
            <strong>{submission.verificationStatus === 'manual_review' ? pageText('billing.taoCheckout.manualReviewRequired') : pageText('billing.taoCheckout.transactionReferenceSubmitted')}</strong>
            <small>{submission.verificationStatus === 'manual_review'
              ? pageText('billing.taoCheckout.theServerAcceptedTheReferenceForReviewNoCredit')
              : pageText('billing.taoCheckout.awaitingFinalizedServerVerificationYourCreditHasNotBeen')}</small>
          </span>
        </section>
      ) : null}
    </section>
  )
}
