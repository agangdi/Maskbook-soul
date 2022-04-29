import type { FC } from 'react'
import { isEIP1559Supported, useChainId } from '@masknet/web3-shared-evm'
import { GasSetting1559 } from './GasSetting1559'
import { Prior1559GasSetting } from './Prior1559GasSetting'
import type { GasSettingProps } from './types'

export const GasSetting: FC<GasSettingProps> = (props) => {
    const chainId = useChainId()
    return isEIP1559Supported(chainId) ? <GasSetting1559 {...props} /> : <Prior1559GasSetting {...props} />
}
