import urlcat from 'urlcat'
import { compact, first } from 'lodash-unified'
import {
    createLookupTableResolver,
    CurrencyType,
    HubOptions,
    FungibleToken,
    NonFungibleAsset,
    NonFungibleToken,
    NonFungibleTokenEvent,
    NonFungibleTokenOrder,
    OrderSide,
    TokenType,
} from '@masknet/web3-shared-base'
import {
    ChainId,
    SchemaType,
    resolveIPFSLinkFromURL,
    createERC721Token,
    createERC721Metadata,
    createERC721Contract,
    createERC721Collection,
} from '@masknet/web3-shared-evm'
import {
    Ownership,
    RaribleEventType,
    RaribleHistory,
    RaribleNFTItemMapResponse,
    RaribleOfferResponse,
    RaribleProfileResponse,
} from './types'
import { RaribleUserURL, RaribleRopstenUserURL, RaribleMainnetURL, RaribleChainURL, RaribleURL } from './constants'
import { isProxyENV } from '../helpers'
import type { NonFungibleTokenAPI } from '../types'

const resolveRaribleUserNetwork = createLookupTableResolver<ChainId.Mainnet | ChainId.Ropsten, string>(
    {
        [ChainId.Mainnet]: RaribleUserURL,
        [ChainId.Ropsten]: RaribleRopstenUserURL,
    },
    RaribleUserURL,
)

async function fetchFromRarible<T>(url: string, path: string, init?: RequestInit) {
    const response = await fetch(urlcat(url, path), {
        ...(!isProxyENV() && { mode: 'cors' }),
        ...init,
    })
    return response.json() as Promise<T>
}

function getProfilesFromRarible(addresses: Array<string | undefined>) {
    return fetchFromRarible<RaribleProfileResponse[]>(RaribleMainnetURL, '/profiles/list', {
        method: 'POST',
        body: JSON.stringify(addresses),
        headers: {
            'content-type': 'application/json',
        },
    })
}

function createERC721TokenFromAsset(
    tokenAddress: string,
    tokenId: string,
    asset?: RaribleNFTItemMapResponse,
): NonFungibleToken<ChainId, SchemaType.ERC721> {
    const imageURL = resolveIPFSLinkFromURL(asset?.meta?.image?.url.ORIGINAL ?? asset?.meta?.image?.url.PREVIEW ?? '')
    return createERC721Token(
        ChainId.Mainnet,
        tokenAddress,
        tokenId,
        createERC721Metadata(ChainId.Mainnet, asset?.meta?.name ?? '', '', '', imageURL, imageURL),
        createERC721Contract(ChainId.Mainnet, tokenAddress, asset?.meta?.name ?? '', '', first(asset?.owners)),
        createERC721Collection(ChainId.Mainnet, asset?.meta?.name ?? '', '', '', ''),
    )
}

function createNFTAsset(
    asset: RaribleNFTItemMapResponse,
    chainId: ChainId,
): NonFungibleAsset<ChainId, SchemaType.ERC721> {
    const owner = first(asset?.owners)
    const creator = first(asset?.creators)
    return {
        id: asset.contract,
        chainId,
        tokenId: asset.tokenId,
        type: TokenType.NonFungible,
        address: asset.contract,
        schema: SchemaType.ERC721,
        creator: creator
            ? {
                  address: creator.account,
                  avatarURL: '',
                  nickname: creator.account,
                  link: '',
              }
            : undefined,
        owner: owner
            ? {
                  address: owner,
                  avatarURL: '',
                  nickname: owner,
                  link: '',
              }
            : undefined,
        traits: asset?.meta?.attributes.map(({ key, value }) => ({ type: key, value })) ?? [],
        price: {
            [CurrencyType.USD]: '0',
        },

        // image_url: resolveIPFSLinkFromURL(asset?.meta?.image?.url.ORIGINAL ?? ''),

        // asset_contract: null,

        // description: asset?.meta?.description ?? '',
        // name: asset?.meta?.name ?? 'Unknown',
        // collection_name: '',
        // animation_url: asset.meta?.animation?.url.PREVIEW,
        // current_price: 0,
        // current_symbol: 'ETH',
        // end_time: null,
        // order_payment_tokens: [] as FungibleToken<ChainId, SchemaType.ERC721>[],
        // offer_payment_tokens: [] as FungibleToken<ChainId, SchemaType.ERC721>[],
        // top_ownerships: owner
        //     ? [
        //           {
        //               owner: {
        //                   address: owner,
        //                   profile_img_url: '',
        //                   user: { username: owner },
        //                   link: '',
        //               },
        //           },
        //       ]
        //     : [],
        // slug: '',
        // response_: asset,
        // token_id: asset.tokenId,
        // safelist_request_status: '',
        // last_sale: null,
    }
}

function _getAsset(address: string, tokenId: string) {
    const requestPath = urlcat('/v0.1/nft/items/:address::tokenId', {
        includeMeta: true,
        address,
        tokenId,
    })
    return fetchFromRarible<RaribleNFTItemMapResponse>(RaribleChainURL, requestPath, {
        method: 'GET',
        mode: 'cors',
        headers: { 'content-type': 'application/json' },
    })
}

export class RaribleAPI implements NonFungibleTokenAPI.Provider<ChainId, SchemaType> {
    async getAsset(address: string, tokenId: string, { chainId = ChainId.Mainnet }: { chainId?: ChainId } = {}) {
        const asset = await _getAsset(address, tokenId)
        if (!asset) return
        return createNFTAsset(asset, chainId)
    }

    async getToken(tokenAddress: string, tokenId: string) {
        const asset = await _getAsset(tokenAddress, tokenId)
        return createERC721TokenFromAsset(tokenAddress, tokenId, asset)
    }

    async getTokens(from: string, { page = 0, size = 50 }: HubOptions<ChainId> = {}) {
        const requestPath = urlcat('/protocol/v0.1/ethereum/nft/items/byOwner', {
            owner: from,
            size,
        })
        interface Payload {
            total: number
            continuation: string
            items: RaribleNFTItemMapResponse[]
        }
        const asset = await fetchFromRarible<Payload>(RaribleURL, requestPath, undefined)

        if (!asset)
            return {
                currentPage: 0,
                data: [],
                hasNextPage: false,
            }
        return {
            currentPage: page,
            data:
                asset.items
                    .map((asset) => createERC721TokenFromAsset(asset.contract, asset.tokenId, asset))
                    .filter((x) => x.contract?.owner?.toLowerCase() === from.toLowerCase())
                    .map((x) => ({ ...x, provideBy: 'Rarible' })) ?? [],
            hasNextPage: !!asset.continuation,
        }
    }

    async getOffers(
        tokenAddress: string,
        tokenId: string,
        { chainId = ChainId.Mainnet }: HubOptions<ChainId> = {},
    ): Promise<Array<NonFungibleTokenOrder<ChainId, SchemaType>>> {
        const requestPath = urlcat('/items/:tokenAddress::tokenId/offers', { tokenAddress, tokenId })
        const orders = await fetchFromRarible<RaribleOfferResponse[]>(RaribleMainnetURL, requestPath, {
            method: 'POST',
            body: JSON.stringify({ size: 20 }),
            headers: { 'content-type': 'application/json' },
        })
        const profiles = await getProfilesFromRarible(orders.map((item) => item.maker))
        return orders.map((order): NonFungibleTokenOrder<ChainId, SchemaType> => {
            const ownerInfo = profiles.find((owner) => owner.id === order.maker)
            return {
                id: order.tokenId,
                chainId: ChainId.Mainnet,
                asset_permalink: '',
                createdAt: Number(order.updateDate),
                price: {
                    usd: order.buyPrice.toString(),
                },
                paymentToken: {
                    name: order.token,
                    id: order.tokenId,
                    type: TokenType.NonFungible,
                    schema: SchemaType.ERC20,
                    chainId,
                    address: tokenAddress,
                    symbol: '',
                    decimals: 0,
                } as FungibleToken<ChainId, SchemaType>,
                side: OrderSide.Buy,
                quantity: order.value.toString(),
                expiredAt: 0,
            }
        })
    }

    async getListings(
        tokenAddress: string,
        tokenId: string,
        { chainId = ChainId.Mainnet }: HubOptions<ChainId> = {},
    ): Promise<Array<NonFungibleTokenOrder<ChainId, SchemaType>>> {
        const requestPath = urlcat('/items/:tokenAddress::tokenId/ownerships', { tokenAddress, tokenId })
        const assets = await fetchFromRarible<Ownership[]>(RaribleMainnetURL, requestPath)
        const listings = assets.filter((x) => x.selling)
        const profiles = await getProfilesFromRarible(listings.map((x) => x.owner))
        return listings.map((asset): NonFungibleTokenOrder<ChainId, SchemaType> => {
            const ownerInfo = profiles.find((owner) => owner.id === asset.owner)
            return {
                id: asset.tokenId,
                chainId: ChainId.Mainnet,
                asset_permalink: '',
                createdAt: Number(asset.date ?? 0),
                price: {
                    usd: asset.price,
                },
                paymentToken: {
                    name: asset.token,
                    id: asset.tokenId,
                    decimals: 0,
                    chainId: ChainId.Mainnet,
                    // symbol: '1',
                    // schema: SchemaType.ERC721,
                    address: tokenAddress,
                    type: TokenType.NonFungible,
                } as FungibleToken<ChainId, SchemaType>,
                side: OrderSide.Buy,
                quantity: asset.value.toString(),
                expiredAt: 0,
            }
        })
    }

    async getOrders(tokenAddress: string, tokenId: string, side: OrderSide, opts: HubOptions<ChainId> = {}) {
        switch (side) {
            case OrderSide.Buy:
                return this.getOffers(tokenAddress, tokenId, opts)
            case OrderSide.Sell:
                return this.getListings(tokenAddress, tokenId, opts)
            default:
                return []
        }
    }

    async getHistory(
        tokenAddress: string,
        tokenId: string,
    ): Promise<Array<NonFungibleTokenEvent<ChainId, SchemaType>>> {
        const response = await fetchFromRarible<RaribleHistory[]>(RaribleMainnetURL, '/activity', {
            method: 'POST',
            body: JSON.stringify({
                // types: ['BID', 'BURN', 'BUY', 'CANCEL', 'CANCEL_BID', 'ORDER', 'MINT', 'TRANSFER', 'SALE'],
                filter: {
                    '@type': 'by_item',
                    address: tokenAddress,
                    tokenId,
                },
                size: 100,
            }),
            headers: {
                'content-type': 'application/json',
            },
        })

        const histories = response.filter((x) => Object.values(RaribleEventType).includes(x['@type']))
        const profiles = await getProfilesFromRarible(
            compact([
                ...histories.map((history) => history.owner),
                ...histories.map((history) => history.buyer),
                ...histories.map((history) => history.from),
            ]),
        )

        return histories.map((history) => {
            const ownerInfo = profiles.find((profile) => profile.id === history.owner)
            const fromInfo = profiles.find((profile) => profile.id === history.buyer || profile.id === history.from)
            return {
                id: history.id,
                chainId: ChainId.Mainnet,
                type: history['@type'],
                assetPermalink: '',
                quantity: history.value,
                timestamp: history.date.getTime() ?? 0,
                hash: history.transactionHash,
                from: {
                    username: fromInfo?.name,
                    address: fromInfo?.id,
                    imageUrl: fromInfo?.image,
                    link: '',
                },
                to: {
                    username: ownerInfo?.name,
                    address: ownerInfo?.id,
                    imageUrl: ownerInfo?.image,
                    link: '',
                },
            } as NonFungibleTokenEvent<ChainId, SchemaType>
        })
    }
}
