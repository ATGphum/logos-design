/**
 * DESIGN SHIM — replaces the real injected-wallet connector, which depends on
 * @polkadot/util-crypto (not a dependency of this sandbox). No browser wallet
 * is ever detected, so the TAO checkout design falls back to the manual
 * transfer flow — the state most useful to design against.
 */
import {
  TaoWalletError,
  taoWalletSourceValid,
  type ConnectedTaoWallet,
  type TaoTransferRequest,
  type TaoTransferSubmission,
  type TaoWalletAdapter,
  type TaoWalletSource,
} from './taoWalletAdapter'

export const taoWalletApplicationName = 'LOGOS' as const
export const bittensorSS58Prefix = 42 as const

export const taoWalletSDKVersions = Object.freeze({
  talisman: 'design-shim',
  'subwallet-js': 'design-shim',
  'polkadot-js': 'design-shim',
})

export type TaoInjectedTransferContext = Readonly<{
  source: TaoWalletSource
  canonicalAddress: string
  injectedAddress: string
  signer: unknown
  signal: AbortSignal
}>

export interface TaoInjectedTransferClient {
  transferKeepAlive(input: TaoTransferRequest, context: TaoInjectedTransferContext): Promise<unknown>
}

export type InjectedTaoWalletConnectorOptions = Readonly<{
  providerRegistry?: () => unknown
  transferClient?: TaoInjectedTransferClient
  now?: () => number
}>

/** Identity in the design shim — real canonicalization needs ss58 codecs. */
export function canonicalizeBittensorInjectedAddress(address: string): string {
  return address
}

export class InjectedTaoWalletConnector implements TaoWalletAdapter {
  constructor(_options: InjectedTaoWalletConnectorOptions = {}) {}

  availability(): Readonly<Record<TaoWalletSource, boolean>> {
    return Object.freeze({ talisman: false, 'subwallet-js': false, 'polkadot-js': false })
  }

  availableAccounts(): readonly ConnectedTaoWallet[] {
    return []
  }

  selectAccount(_address: string): ConnectedTaoWallet {
    throw new TaoWalletError('wallet_no_accounts')
  }

  async connect(source: TaoWalletSource): Promise<ConnectedTaoWallet> {
    throw new TaoWalletError('wallet_not_installed', taoWalletSourceValid(source) ? source : undefined)
  }

  subscribeAccounts(_onChange: (accounts: ConnectedTaoWallet[]) => void): () => void {
    return () => {}
  }

  async disconnect(): Promise<void> {}

  async transfer(_input: TaoTransferRequest): Promise<TaoTransferSubmission> {
    throw new TaoWalletError('wallet_not_installed')
  }
}
