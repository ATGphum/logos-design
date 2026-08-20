import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy, ExternalLink, Landmark, QrCode, RefreshCw, ShieldAlert } from 'lucide-react'
import QRCode from './qrcodeShim' // DESIGN SHIM (was 'qrcode')
import type { QRCodeToDataURLOptions } from './qrcodeShim' // DESIGN SHIM (was 'qrcode')
import {
  formatAtomicAssetAmount,
  type CryptoDepositAddress,
  type CryptoDepositFixture,
  type CryptoDepositNetwork,
  type CryptoDepositWarningCode,
} from '../../depositTypes'
import { pageText } from '../../i18n/pageText'

export type CryptoDepositStep = 'crypto_address'

type CryptoDepositPanelProps = {
  fixture: CryptoDepositFixture
  step: CryptoDepositStep
  onBackToMethods: () => void
}

const qrOptions = Object.freeze({
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 196,
  color: Object.freeze({ dark: '#141310ff', light: '#ffffffff' }),
} as const satisfies QRCodeToDataURLOptions)

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function warningText(code: CryptoDepositWarningCode) {
  switch (code) {
    case 'correct_network_only':
      return pageText('billing.cryptoDepositPanel.warningCorrectNetworkOnly')
    case 'supported_native_asset_only':
      return pageText('billing.cryptoDepositPanel.warningSupportedNativeAssetOnly')
    case 'irreversible_transfer':
      return pageText('billing.cryptoDepositPanel.warningIrreversibleTransfer')
    case 'settled_at_processing_rate':
      return pageText('billing.cryptoDepositPanel.warningSettledAtProcessingRate')
    case 'test_small_amount_first':
      return pageText('billing.cryptoDepositPanel.warningTestSmallAmountFirst')
  }
}

function addressMatchesFixture(address: CryptoDepositAddress, network: CryptoDepositNetwork) {
  if (address.networkId !== network.networkId || address.addressFormat !== network.addressFormat || address.status !== 'active') return false
  if (address.address.trim() !== address.address || address.address.length < 1 || address.address.length > 128 || address.qrPayload !== address.address) return false
  try {
    const explorer = new URL(address.explorerUrl)
    return explorer.protocol === 'https:' && explorer.username === '' && explorer.password === '' && explorer.origin === network.explorerOrigin
  } catch {
    return false
  }
}

function availabilityText(network: CryptoDepositNetwork) {
  switch (network.availability.reasonCode) {
    case 'policy_restricted':
      return pageText('billing.cryptoDepositPanel.availabilityPolicyRestricted')
    case 'allocation_unavailable':
      return pageText('billing.cryptoDepositPanel.availabilityAllocationUnavailable')
    case 'processing_degraded':
      return pageText('billing.cryptoDepositPanel.availabilityProcessingDegraded')
    case 'maintenance':
      return pageText('billing.cryptoDepositPanel.availabilityMaintenance')
    case null:
      return pageText('billing.cryptoDepositPanel.availabilityReady')
  }
}

function defaultSelection(fixture: CryptoDepositFixture) {
  const network = fixture.catalog.networks.find((item) => item.isDefault) ?? fixture.catalog.networks[0] ?? null
  const asset = network?.assets.find((item) => item.isDefault) ?? network?.assets[0] ?? null
  return { network, asset }
}

export function CryptoDepositPanel({ fixture, step, onBackToMethods }: CryptoDepositPanelProps) {
  const initial = useMemo(() => defaultSelection(fixture), [fixture])
  const [addresses, setAddresses] = useState<Readonly<Record<string, CryptoDepositAddress>>>({})
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [qrDataURL, setQrDataURL] = useState('')
  const [qrError, setQrError] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')
  const requestGeneration = useRef(0)
  const requestController = useRef<AbortController | null>(null)
  const copyTimer = useRef<number | null>(null)

  const selectedNetwork = initial.network
  const selectedAsset = initial.asset
  const address = selectedNetwork ? addresses[selectedNetwork.networkId] ?? null : null

  useEffect(() => () => {
    requestController.current?.abort()
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
  }, [])

  useEffect(() => {
    if (address === null) {
      setQrDataURL('')
      setQrError(false)
      return
    }
    let active = true
    setQrDataURL('')
    setQrError(false)
    void QRCode.toDataURL(address.qrPayload, qrOptions).then((value) => {
      if (active) setQrDataURL(value)
    }).catch(() => {
      if (active) setQrError(true)
    })
    return () => { active = false }
  }, [address])

  const loadSelectedAddress = useCallback(async () => {
    if (selectedNetwork === null || selectedAsset === null || !selectedNetwork.availability.canReadAddress) return
    if (addresses[selectedNetwork.networkId]) {
      setAddressError('')
      return
    }
    requestController.current?.abort()
    const controller = new AbortController()
    const generation = requestGeneration.current + 1
    requestGeneration.current = generation
    requestController.current = controller
    setAddressLoading(true)
    setAddressError('')
    try {
      const nextAddress = await fixture.loadAddress(selectedNetwork.networkId, { signal: controller.signal })
      if (controller.signal.aborted || requestGeneration.current !== generation) return
      if (!addressMatchesFixture(nextAddress, selectedNetwork)) throw new Error('fixture_address_mismatch')
      setAddresses((current) => Object.freeze({ ...current, [selectedNetwork.networkId]: nextAddress }))
    } catch (error) {
      // DESIGN HANDOFF: visibility changes intentionally abort deposit reads. Keep
      // that cancellation recoverable instead of presenting it as an address error.
      if (!controller.signal.aborted && requestGeneration.current === generation && !isAbortError(error)) {
        setAddressError(pageText('billing.cryptoDepositPanel.addressUnavailable'))
      }
    } finally {
      if (requestGeneration.current === generation) {
        setAddressLoading(false)
        requestController.current = null
      }
    }
  }, [addresses, fixture, selectedAsset, selectedNetwork])

  useEffect(() => {
    if (step !== 'crypto_address' || address !== null || addressLoading || addressError !== '') return
    // DESIGN HANDOFF: an aborted hidden-tab read resumes when the page becomes
    // visible, without requiring the user to press Retry address.
    const loadWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadSelectedAddress()
    }
    loadWhenVisible()
    document.addEventListener('visibilitychange', loadWhenVisible)
    return () => document.removeEventListener('visibilitychange', loadWhenVisible)
  }, [address, addressError, addressLoading, loadSelectedAddress, step])

  const copyAddress = async () => {
    if (address === null || selectedNetwork?.availability.acceptingDeposits !== true) return
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    try {
      await navigator.clipboard.writeText(address.address)
      setCopyFeedback(pageText('billing.cryptoDepositPanel.addressCopied'))
    } catch {
      setCopyFeedback(pageText('billing.cryptoDepositPanel.copyFailed'))
    }
    copyTimer.current = window.setTimeout(() => setCopyFeedback(''), 4_000)
  }

  const returnToMethods = () => {
    requestController.current?.abort()
    requestController.current = null
    requestGeneration.current += 1
    setAddressLoading(false)
    setAddressError('')
    setCopyFeedback('')
    onBackToMethods()
  }

  if (selectedNetwork === null || selectedAsset === null) {
    return (
      <section className="crypto-deposit-panel crypto-deposit-panel--empty" role="alert">
        <Landmark size={28} aria-hidden="true" />
        <strong>{pageText('billing.cryptoDepositPanel.catalogUnavailable')}</strong>
        <button className="recharge-step-back" type="button" onClick={onBackToMethods}>
          <ArrowLeft size={17} aria-hidden="true" />
          {pageText('billing.stripeCheckout.backToPaymentMethods')}
        </button>
      </section>
    )
  }

  const addressReadPending = address === null && addressError === '' && selectedNetwork.availability.canReadAddress

  if (addressLoading || addressReadPending) {
    return (
      <section className="crypto-deposit-panel crypto-deposit-loading" role="status" aria-busy="true">
        <button className="recharge-step-back" type="button" onClick={returnToMethods}>
          <ArrowLeft size={17} aria-hidden="true" />
          {pageText('billing.stripeCheckout.backToPaymentMethods')}
        </button>
        <RefreshCw className="billing-spin" size={28} aria-hidden="true" />
        <strong>{pageText('billing.cryptoDepositPanel.loadingPersonalAddress')}</strong>
        <small>{pageText('billing.cryptoDepositPanel.addressBelongsToNetwork')}</small>
      </section>
    )
  }

  if (address === null) {
    return (
      <section className="crypto-deposit-panel crypto-deposit-panel--empty" role="alert">
        <ShieldAlert size={28} aria-hidden="true" />
        <strong>{addressError || pageText('billing.cryptoDepositPanel.addressUnavailable')}</strong>
        <p>{pageText('billing.cryptoDepositPanel.noAddressWasReplacedOrCanceled')}</p>
        <div className="crypto-deposit-empty-actions">
          <button className="recharge-step-back" type="button" onClick={returnToMethods}>
            <ArrowLeft size={17} aria-hidden="true" />
            {pageText('billing.stripeCheckout.backToPaymentMethods')}
          </button>
          <button className="cs-btn" type="button" onClick={() => void loadSelectedAddress()}>{pageText('billing.cryptoDepositPanel.retryAddress')}</button>
        </div>
      </section>
    )
  }

  const acceptingDeposits = selectedNetwork.availability.acceptingDeposits
  const minimum = formatAtomicAssetAmount(selectedAsset.minimumAtomic, selectedAsset.decimals)

  return (
    <section className="crypto-deposit-panel crypto-deposit-address" aria-label={pageText('billing.cryptoDepositPanel.yourCryptoDepositAddress')}>
      <div className="recharge-step-toolbar">
        <button className="recharge-step-back" type="button" onClick={returnToMethods}>
          <ArrowLeft size={17} aria-hidden="true" />
          {pageText('billing.stripeCheckout.backToPaymentMethods')}
        </button>
        <span className={`billing-status-pill billing-status-pill--${acceptingDeposits ? 'active' : 'pending'}`}>
          {acceptingDeposits ? pageText('billing.cryptoDepositPanel.readyToReceive') : pageText('billing.cryptoDepositPanel.doNotTransfer')}
        </span>
      </div>

      {!acceptingDeposits ? (
        <div className="crypto-deposit-stop" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span><strong>{pageText('billing.cryptoDepositPanel.doNotTransferNow')}</strong><small>{availabilityText(selectedNetwork)} {pageText('billing.cryptoDepositPanel.addressRemainsVisible')}</small></span>
        </div>
      ) : selectedNetwork.availability.reasonCode === 'processing_degraded' ? (
        <div className="crypto-deposit-availability" role="status">
          <ShieldAlert size={18} aria-hidden="true" />
          <span><strong>{availabilityText(selectedNetwork)}</strong><small>{pageText('billing.cryptoDepositPanel.processingMayTakeLonger')}</small></span>
        </div>
      ) : null}

      <div className="crypto-deposit-address__identity">
        <span><small>{pageText('billing.cryptoDepositPanel.network')}</small><strong>{selectedNetwork.displayName}</strong></span>
        <span><small>{pageText('billing.cryptoDepositPanel.asset')}</small><strong>{selectedAsset.displayName}</strong></span>
      </div>

      <div className="crypto-deposit-address__main">
        <div className="crypto-deposit-qr">
          {qrDataURL ? (
            <img src={qrDataURL} width="196" height="196" alt={pageText('billing.cryptoDepositPanel.qrCodeAlt', { network: selectedNetwork.displayName, asset: selectedAsset.displayName })} />
          ) : qrError ? (
            <div className="crypto-deposit-qr__fallback"><QrCode size={28} aria-hidden="true" /><span>{pageText('billing.cryptoDepositPanel.qrUnavailable')}</span></div>
          ) : (
            <div className="crypto-deposit-qr__fallback" role="status"><RefreshCw className="billing-spin" size={28} aria-hidden="true" /><span>{pageText('billing.cryptoDepositPanel.generatingQr')}</span></div>
          )}
        </div>
        <div className="crypto-deposit-address__copy">
          <small>{pageText('billing.cryptoDepositPanel.yourPersonalAddress')}</small>
          <code>{address.address}</code>
          <div>
            <button type="button" disabled={!acceptingDeposits} onClick={() => void copyAddress()}>
              {copyFeedback === pageText('billing.cryptoDepositPanel.addressCopied') ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
              {pageText('billing.cryptoDepositPanel.copyAddress')}
            </button>
            <a
              href={address.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={pageText('billing.cryptoDepositPanel.viewOnExplorerAccessible', { network: selectedNetwork.displayName, asset: selectedAsset.displayName })}
            >
              <ExternalLink size={17} aria-hidden="true" />
              {pageText('billing.cryptoDepositPanel.viewOnExplorer')}
            </a>
          </div>
          <output className="crypto-deposit-copy-status" aria-live="polite">{copyFeedback}</output>
        </div>
      </div>

      <dl className="crypto-deposit-facts">
        <div><dt>{pageText('billing.cryptoDepositPanel.minimumDeposit')}</dt><dd>{minimum} {selectedAsset.symbol}</dd></div>
        <div><dt>{pageText('billing.cryptoDepositPanel.estimatedArrival')}</dt><dd>{pageText('billing.cryptoDepositPanel.arrivalMinutes', { minimum: selectedAsset.estimatedArrivalMinutes.minimum, maximum: selectedAsset.estimatedArrivalMinutes.maximum })}</dd></div>
        <div><dt>{pageText('billing.cryptoDepositPanel.creditValue')}</dt><dd>{pageText('billing.cryptoDepositPanel.settlementRate')}</dd></div>
      </dl>

      <div className="crypto-deposit-risks">
        <div><ShieldAlert size={19} aria-hidden="true" /><strong>{pageText('billing.cryptoDepositPanel.beforeYouTransfer')}</strong></div>
        <ul>{selectedAsset.warningCodes.map((code) => <li key={code}>{warningText(code)}</li>)}</ul>
      </div>
    </section>
  )
}
