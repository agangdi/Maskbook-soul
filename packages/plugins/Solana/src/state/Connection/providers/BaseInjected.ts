import { isExtensionSiteType } from '@masknet/shared-base'
import type { InjectedProvider } from '@masknet/injected-script/sdk/Base'
import type { Account } from '@masknet/web3-shared-base'
import type { ChainId, ProviderType, Web3Provider } from '@masknet/web3-shared-solana'
import type { SolanaProvider } from '../types'
import { BaseProvider } from './Base'

export class BaseInjectedProvider extends BaseProvider implements SolanaProvider {
    constructor(protected providerType: ProviderType, protected bridge: InjectedProvider) {
        super()

        bridge.on('accountsChanged', this.onAccountsChanged.bind(this))
        bridge.on('chainChanged', this.onChainChanged.bind(this))
        bridge.on('disconnect', this.onDisconnect.bind(this))
    }

    override get ready() {
        return this.bridge.isReady
    }

    override get readyPromise() {
        if (isExtensionSiteType()) return Promise.reject(new Error('Not available on extension site.'))
        return this.bridge.untilAvailable().then(() => undefined)
    }

    protected onAccountsChanged(accounts: string[]) {
        this.emitter.emit('accounts', accounts)
    }

    protected onChainChanged(chainId: string) {
        this.emitter.emit('chainId', chainId)
    }

    protected onDisconnect() {
        this.emitter.emit('disconnect', this.providerType)
    }

    override async createWeb3Provider(chainId?: ChainId) {
        await this.readyPromise

        if (!this.bridge) throw new Error('Failed to detect in-page provider.')
        return this.bridge as unknown as Web3Provider
    }

    override async connect(chainId: ChainId): Promise<Account<ChainId>> {
        await this.readyPromise

        const provider = await this.createWeb3Provider()
        const response = await provider.connect()

        return {
            chainId,
            account: response.publicKey,
        }
    }

    override async disconnect(): Promise<void> {
        await this.readyPromise

        const provider = await this.createWeb3Provider()
        await provider.disconnect()
    }
}
