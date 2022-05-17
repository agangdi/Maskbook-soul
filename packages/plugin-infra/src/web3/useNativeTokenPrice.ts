import { useAsyncRetry } from 'react-use'
import type { CurrencyType, NetworkPluginID } from '@masknet/web3-shared-base'
import type { Web3Helper } from '../web3-helpers'
import { useWeb3State } from './useWeb3State'
import { useNativeTokenAddress } from './useNativeTokenAddress'
import { useChainId } from '../entry-web3'

export function useNativeTokenPrice<T extends NetworkPluginID>(
    pluginID: T,
    options?: Web3Helper.Web3ConnectionOptions<T> & {
        currencyType?: CurrencyType
    },
) {
    type GetFungibleTokenPrice = (
        chainId: Web3Helper.Definition[T]['ChainId'],
        address: string,
        currencyType?: CurrencyType,
    ) => Promise<number>

    const chainId = useChainId(pluginID)
    const { TokenPrice } = useWeb3State(pluginID)
    const nativeTokenAddress = useNativeTokenAddress(pluginID, options)

    return useAsyncRetry(async () => {
        return (TokenPrice?.getFungibleTokenPrice as GetFungibleTokenPrice)(
            chainId,
            nativeTokenAddress,
            options?.currencyType,
        )
    }, [chainId, nativeTokenAddress, options?.currencyType, TokenPrice])
}
