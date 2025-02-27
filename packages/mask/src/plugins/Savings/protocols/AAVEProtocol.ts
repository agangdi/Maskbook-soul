import BigNumber from 'bignumber.js'
import type Web3 from 'web3'
import type { AbiItem } from 'web3-utils'
import AaveLendingPoolABI from '@masknet/web3-contracts/abis/AaveLendingPool.json'
import AaveLendingPoolAddressProviderABI from '@masknet/web3-contracts/abis/AaveLendingPoolAddressProvider.json'
import ERC20ABI from '@masknet/web3-contracts/abis/ERC20.json'
import type { AaveLendingPool } from '@masknet/web3-contracts/types/AaveLendingPool'
import type { AaveLendingPoolAddressProvider } from '@masknet/web3-contracts/types/AaveLendingPoolAddressProvider'
import type { ERC20 } from '@masknet/web3-contracts/types/ERC20'
import { FungibleToken, pow10, ZERO } from '@masknet/web3-shared-base'
import {
    ChainId,
    createContract,
    getAaveConstants,
    SchemaType,
    TransactionEventType,
    ZERO_ADDRESS,
} from '@masknet/web3-shared-evm'
import { ProtocolType, SavingsProtocol } from '../types'

export class AAVEProtocol implements SavingsProtocol {
    static DEFAULT_APR = '0.17'

    private _apr = '0.00'
    private _balance = ZERO

    constructor(readonly pair: [FungibleToken<ChainId, SchemaType>, FungibleToken<ChainId, SchemaType>]) {}

    get type() {
        return ProtocolType.AAVE
    }

    get apr() {
        return this._apr
    }

    get balance() {
        return this._balance
    }

    get bareToken() {
        return this.pair[0]
    }

    get stakeToken() {
        return this.pair[1]
    }

    public async updateApr(chainId: ChainId, web3: Web3) {
        try {
            const subgraphUrl = getAaveConstants(chainId).AAVE_SUBGRAPHS || ''

            if (!subgraphUrl) {
                this._apr = AAVEProtocol.DEFAULT_APR
                return
            }

            const body = JSON.stringify({
                query: `{
                reserves (where: {
                    underlyingAsset: "${this.bareToken.address}"
                    pool: "0xb53c1a33016b2dc2ff3653530bff1848a515c8c5"
                }) {
                    id
                    name
                    underlyingAsset
                    price {
                     id
                    }
                    liquidityRate
                  }
                }`,
            })
            const response = await fetch(subgraphUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            })
            const fullResponse: {
                data: {
                    reserves: Array<{
                        id: string
                        name: string
                        decimals: number
                        underlyingAsset: string
                        liquidityRate: number
                    }>
                }
            } = await response.json()
            const liquidityRate = +fullResponse.data.reserves[0].liquidityRate

            const RAY = pow10(27) // 10 to the power 27

            // APY and APR are returned here as decimals, multiply by 100 to get the percents
            this._apr = new BigNumber(liquidityRate).times(100).div(RAY).toFixed(2)
        } catch (error) {
            console.error('AAVE: Apr Error:', error)
            this._apr = AAVEProtocol.DEFAULT_APR
        }
    }

    public async updateBalance(chainId: ChainId, web3: Web3, account: string) {
        try {
            const subgraphUrl = getAaveConstants(chainId).AAVE_SUBGRAPHS || ''

            if (!subgraphUrl) {
                this._apr = AAVEProtocol.DEFAULT_APR
                return
            }

            const body = JSON.stringify({
                query: `{
                reserves (where: {
                    underlyingAsset: "${this.bareToken.address}"
                    pool : "0xb53c1a33016b2dc2ff3653530bff1848a515c8c5"
                }) {
                    id
                    aToken {
                      id
                    }
                    }
                }`,
            })
            const response = await fetch(subgraphUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            })

            const fullResponse: {
                data: {
                    reserves: Array<{
                        aToken: {
                            id: string
                        }
                    }>
                }
            } = await response.json()

            const aTokenId = fullResponse.data.reserves[0].aToken.id
            const contract = createContract<ERC20>(web3, aTokenId || ZERO_ADDRESS, ERC20ABI as AbiItem[])
            this._balance = new BigNumber((await contract?.methods.balanceOf(account).call()) ?? '0')
        } catch (error) {
            console.error('AAVE BALANCE ERROR: ', error)
            this._balance = ZERO
        }
    }

    public async depositEstimate(account: string, chainId: ChainId, web3: Web3, value: BigNumber.Value) {
        try {
            const operation = await this.createDepositTokenOperation(account, chainId, web3, value)
            const gasEstimate = await operation?.estimateGas({
                from: account,
            })

            return new BigNumber(gasEstimate || 0)
        } catch (error) {
            console.error('AAVE deposit estimate ERROR: ', error)
            return ZERO
        }
    }

    private async createDepositTokenOperation(account: string, chainId: ChainId, web3: Web3, value: BigNumber.Value) {
        const aaveLPoolAddress =
            getAaveConstants(chainId).AAVE_LENDING_POOL_ADDRESSES_PROVIDER_CONTRACT_ADDRESS || ZERO_ADDRESS
        const lPoolAddressProviderContract = createContract<AaveLendingPoolAddressProvider>(
            web3,
            aaveLPoolAddress,
            AaveLendingPoolAddressProviderABI as AbiItem[],
        )

        const poolAddress = await lPoolAddressProviderContract?.methods.getLendingPool().call()

        const contract = createContract<AaveLendingPool>(
            web3,
            poolAddress || ZERO_ADDRESS,
            AaveLendingPoolABI as AbiItem[],
        )
        return contract?.methods.deposit(this.bareToken.address, new BigNumber(value).toFixed(), account, '0')
    }

    public async deposit(account: string, chainId: ChainId, web3: Web3, value: BigNumber.Value) {
        const gasEstimate = await this.depositEstimate(account, chainId, web3, value)
        const operation = await this.createDepositTokenOperation(account, chainId, web3, value)
        if (!operation) {
            throw new Error("Can't create deposit operation")
        }
        return new Promise<string>((resolve, reject) => {
            operation
                .send({
                    from: account,
                    gas: gasEstimate.toNumber(),
                })
                .once(TransactionEventType.ERROR, reject)
                .once(TransactionEventType.CONFIRMATION, (_, receipt) => {
                    resolve(receipt.transactionHash)
                })
        })
    }

    public async withdrawEstimate(account: string, chainId: ChainId, web3: Web3, value: BigNumber.Value) {
        try {
            const lPoolAddressProviderContract = createContract<AaveLendingPoolAddressProvider>(
                web3,
                getAaveConstants(chainId).AAVE_LENDING_POOL_ADDRESSES_PROVIDER_CONTRACT_ADDRESS || ZERO_ADDRESS,
                AaveLendingPoolAddressProviderABI as AbiItem[],
            )

            const poolAddress = await lPoolAddressProviderContract?.methods.getLendingPool().call()

            const contract = createContract<AaveLendingPool>(
                web3,
                poolAddress || ZERO_ADDRESS,
                AaveLendingPoolABI as AbiItem[],
            )
            const gasEstimate = await contract?.methods
                .withdraw(this.bareToken.address, new BigNumber(value).toFixed(), account)
                .estimateGas({
                    from: account,
                })
            return new BigNumber(gasEstimate || 0)
        } catch (error) {
            return ZERO
        }
    }

    public async withdraw(account: string, chainId: ChainId, web3: Web3, value: BigNumber.Value) {
        const lPoolAddressProviderContract = createContract<AaveLendingPoolAddressProvider>(
            web3,
            getAaveConstants(chainId).AAVE_LENDING_POOL_ADDRESSES_PROVIDER_CONTRACT_ADDRESS || ZERO_ADDRESS,
            AaveLendingPoolAddressProviderABI as AbiItem[],
        )

        const poolAddress = await lPoolAddressProviderContract?.methods.getLendingPool().call()

        const gasEstimate = await this.withdrawEstimate(account, chainId, web3, value)
        const contract = createContract<AaveLendingPool>(
            web3,
            poolAddress || ZERO_ADDRESS,
            AaveLendingPoolABI as AbiItem[],
        )
        return new Promise<string>((resolve) =>
            contract?.methods
                .withdraw(this.bareToken.address, new BigNumber(value).toFixed(), account)
                .send({
                    from: account,
                    gas: gasEstimate.toNumber(),
                })
                .once(TransactionEventType.CONFIRMATION, (_, receipt) => {
                    resolve(receipt.transactionHash)
                }),
        )
    }
}
