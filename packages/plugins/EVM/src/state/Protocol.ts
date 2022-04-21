import type { Transaction } from 'web3-core'
import type { Subscription } from 'use-subscription'
import type { Plugin } from '@masknet/plugin-infra'
import { ProtocolState, Web3Plugin } from '@masknet/plugin-infra/web3'
import type { ChainId, EthereumTransactionConfig, ProviderType } from '@masknet/web3-shared-evm'
import { createConnection } from './Protocol/connection'
import type { EVM_Web3 } from './Protocol/types'

export class Protocol
    extends ProtocolState<ChainId, ProviderType, string, EthereumTransactionConfig, Transaction, string, EVM_Web3>
    implements
        Web3Plugin.ObjectCapabilities.ProtocolState<
            ChainId,
            ProviderType,
            string,
            EthereumTransactionConfig,
            Transaction,
            string,
            EVM_Web3
        >
{
    constructor(
        private context: Plugin.Shared.SharedContext,
        subscription: {
            account?: Subscription<string>
            chainId?: Subscription<ChainId>
            providerType?: Subscription<ProviderType>
        },
    ) {
        super(createConnection, subscription)
    }
}
