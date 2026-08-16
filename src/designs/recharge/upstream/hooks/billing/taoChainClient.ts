/**
 * DESIGN SHIM — replaces the real Bittensor chain client, which depends on
 * dedot (not a dependency of this sandbox). Never talks to a chain; transfers
 * fail with wallet_rpc_unavailable if something ever reaches them (the wallet
 * connector shim never connects, so nothing should).
 */
import { TaoWalletError } from './taoWalletAdapter'
import type { TaoTransferRequest } from './taoWalletAdapter'
import type { TaoInjectedTransferClient, TaoInjectedTransferContext } from './injectedTaoWalletConnector'

export const bittensorMainnetGenesisHash = '0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03' as const

export type TaoLegacyChainClient = Readonly<{
  genesisHash: unknown
  consts: Record<string, unknown>
  query: Record<string, unknown>
  tx: Record<string, unknown>
  disconnect(): Promise<void>
}>

export type TaoLegacyChainClientFactory = (endpoint: string) => Promise<TaoLegacyChainClient>

export type DedotTaoChainClientOptions = Readonly<{
  clientFactory?: TaoLegacyChainClientFactory
  now?: () => number
  rpcTimeoutMilliseconds?: number
  walletApprovalTimeoutMilliseconds?: number
}>

export function taoBrowserPublicWSSURLValid(value: string): boolean {
  if (value.length > 2048 || value.trim() !== value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'wss:' && parsed.username === '' && parsed.password === '' &&
      parsed.port === '' && parsed.search === '' && parsed.hash === '' &&
      (parsed.pathname === '' || parsed.pathname === '/')
  } catch {
    return false
  }
}

export class DedotTaoInjectedTransferClient implements TaoInjectedTransferClient {
  constructor(endpoint: string, _options: DedotTaoChainClientOptions = {}) {
    if (!taoBrowserPublicWSSURLValid(endpoint)) {
      throw new TypeError('A public credential-free Bittensor WSS endpoint is required.')
    }
  }

  async transferKeepAlive(_input: TaoTransferRequest, _context: TaoInjectedTransferContext): Promise<unknown> {
    throw new TaoWalletError('wallet_rpc_unavailable')
  }
}
