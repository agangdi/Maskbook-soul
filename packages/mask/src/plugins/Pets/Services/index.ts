import { getCustomEssayFromRSS, getConfigNFTsFromRSS, saveCustomEssayToRSS } from './rss3'
// import { personalSign } from '../../../extension/background-script/EthereumService'
import type { PetMetaDB } from '../types'
import { WalletRPC } from '../../Wallet/messages'

export * from './storage'

export async function saveEssay(address: string, petMeta: PetMetaDB, userId: string): Promise<PetMetaDB | undefined> {
    const signature = await WalletRPC.signPersonalMessage(userId, address)
    return saveCustomEssayToRSS(address, petMeta, signature)
}

export function getEssay(address: string): Promise<PetMetaDB | undefined> {
    return getCustomEssayFromRSS(address)
}

export function getConfigEssay(): Promise<any> {
    return getConfigNFTsFromRSS()
}
