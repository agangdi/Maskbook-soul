import { useMemo } from 'react'
import { useAsyncRetry } from 'react-use'
import type { AsyncStateRetry } from 'react-use/lib/useAsyncRetry'
import Fuse from 'fuse.js'
import { EthereumAddress } from 'wallet.ts'
import { useWeb3Context } from '../context'
import { useChainId } from './useChainId'
import { currySameAddress } from '../utils'
import type { ERC20TokenDetailed, NativeTokenDetailed, ChainId } from '../types'
import { EMPTY_LIST } from '@masknet/shared-base'

export function useERC20TokensDetailedFromTokenLists(
    lists?: string[],
    keyword = '',
    additionalTokens: Array<ERC20TokenDetailed | NativeTokenDetailed> = EMPTY_LIST,
    targetChainId?: ChainId,
): AsyncStateRetry<Array<ERC20TokenDetailed | NativeTokenDetailed>> {
    // #region fetch token lists
    const currentChainId = useChainId()
    const chainId = targetChainId ?? currentChainId
    const { fetchERC20TokensFromTokenLists } = useWeb3Context()
    const { value: tokensFromList = EMPTY_LIST, ...asyncResult } = useAsyncRetry(
        async () => (!lists || lists.length === 0 ? [] : fetchERC20TokensFromTokenLists(lists, chainId)),
        [chainId, lists?.sort((a, b) => a.localeCompare(b, 'en-US')).join()],
    )
    // #endregion
    // #region fuse
    const fuse = useMemo(
        () =>
            new Fuse([...additionalTokens, ...tokensFromList], {
                shouldSort: true,
                threshold: 0,
                minMatchCharLength: 1,
                keys: [
                    { name: 'name', weight: 0.5 },
                    { name: 'symbol', weight: 1 },
                ],
            }),
        [tokensFromList, additionalTokens.map((x) => x.address).join()],
    )
    // #endregion

    // #region create searched tokens
    const searchedTokens = useMemo(() => {
        const allToken = [...additionalTokens, ...tokensFromList]
        if (!keyword) return allToken

        return [
            ...(EthereumAddress.isValid(keyword) ? allToken.filter(currySameAddress(keyword)) : []),
            ...fuse.search(keyword).map((x) => x.item),
        ]
    }, [keyword, fuse, tokensFromList, additionalTokens.map((x) => x.address).join()])
    // #endregion

    if (!asyncResult.error)
        return {
            ...asyncResult,
            value: searchedTokens,
        }
    return {
        ...asyncResult,
        value: undefined,
    }
}
