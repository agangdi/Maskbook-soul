import { makeStyles, useCustomSnackbar, useStylesExtends } from '@masknet/theme'
import {
    ERC721ContractDetailed,
    resolveTransactionLinkOnExplorer,
    useERC721ContractIsApproveForAll,
    useERC721ContractSetApproveForAllCallback,
} from '@masknet/web3-shared-evm'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Link, Typography } from '@mui/material'
import { useCallback, useMemo } from 'react'
import { EthereumAddress } from 'wallet.ts'
import type { ActionButtonProps } from '../../extension/options-page/DashboardComponents/ActionButton'
import { useI18N } from '../../utils'
import { PluginWalletStatusBar } from '../../utils/components/PluginWalletStatusBar'

const useStyles = makeStyles()(() => ({
    snackBarText: {
        fontSize: 14,
    },
    snackBarLink: {
        color: 'white',
    },
    openIcon: {
        display: 'flex',
        width: 18,
        height: 18,
        marginLeft: 2,
    },
    snackBar: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: 'translateY(1px)',
    },
}))

export interface EthereumERC712TokenApprovedBoundaryProps extends withClasses<'approveButton'> {
    children?: React.ReactNode
    owner: string | undefined
    contractDetailed: ERC721ContractDetailed | undefined
    validationMessage?: string
    operator: string | undefined
    ActionButtonProps?: ActionButtonProps
}

export function EthereumERC721TokenApprovedBoundary(props: EthereumERC712TokenApprovedBoundaryProps) {
    const { owner, contractDetailed, operator, children, validationMessage: _validationMessage } = props
    const { t } = useI18N()
    const classes = useStylesExtends(useStyles(), props)
    const { value, loading, retry } = useERC721ContractIsApproveForAll(contractDetailed?.address, owner, operator)
    const [approveState, approveCallback] = useERC721ContractSetApproveForAllCallback(
        contractDetailed?.address,
        operator,
        true,
    )
    const { showSnackbar } = useCustomSnackbar()

    const approve = useCallback(async () => {
        const hash = await approveCallback()
        if (typeof hash !== 'string') {
            showSnackbar(approveState.error?.message)
            return
        }
        showSnackbar(
            <div className={classes.snackBar}>
                <Typography className={classes.snackBarText}>
                    {t('plugin_wallet_approve_all_nft_successfully', { symbol: contractDetailed?.symbol })}
                </Typography>
                <Link
                    href={resolveTransactionLinkOnExplorer(contractDetailed!.chainId, hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classes.snackBarLink}>
                    <OpenInNewIcon className={classes.openIcon} />
                </Link>
            </div>,
            {
                variant: 'success',
                anchorOrigin: { horizontal: 'right', vertical: 'top' },
            },
        )
        retry()
    }, [showSnackbar, approveState, retry, contractDetailed])

    const validationMessage = useMemo(() => {
        if (!contractDetailed?.address || !EthereumAddress.isValid(contractDetailed?.address))
            return t('plugin_wallet_select_a_nft_contract')
        if (!owner || !EthereumAddress.isValid(owner)) return t('plugin_wallet_select_a_nft_owner')
        if (!operator || !EthereumAddress.isValid(operator)) return t('plugin_wallet_select_a_nft_operator')
        if (_validationMessage) return _validationMessage
        return ''
    }, [contractDetailed, owner, operator, _validationMessage])

    if (approveState.loading) {
        return (
            <PluginWalletStatusBar
                actionProps={{
                    loading: true,
                    disabled: true,
                    title: t('plugin_wallet_nft_approving_all', {
                        symbol: contractDetailed?.symbol
                            ? contractDetailed.symbol.toLowerCase() === 'unknown'
                                ? 'All'
                                : contractDetailed.symbol
                            : 'All',
                    }),
                }}
                classes={{ button: classes.approveButton }}
            />
        )
    } else if (validationMessage) {
        return (
            <PluginWalletStatusBar
                actionProps={{
                    disabled: true,
                    title: validationMessage,
                }}
                classes={{ button: classes.approveButton }}
            />
        )
    } else if (loading) {
        return (
            <PluginWalletStatusBar
                actionProps={{
                    disabled: true,
                    loading: true,
                }}
                classes={{ button: classes.approveButton }}
            />
        )
    } else if (value === false) {
        return (
            <PluginWalletStatusBar
                actionProps={{
                    action: approve,
                    title: t('plugin_wallet_approve_all_nft', {
                        symbol: contractDetailed?.symbol
                            ? contractDetailed.symbol.toLowerCase() === 'unknown'
                                ? 'All'
                                : contractDetailed.symbol
                            : 'All',
                    }),
                }}
                classes={{ button: classes.approveButton }}
            />
        )
    } else if (value === undefined) {
        return (
            <PluginWalletStatusBar
                actionProps={{
                    action: async () => retry(),
                    title: t('plugin_wallet_fail_to_load_nft_contract'),
                }}
                classes={{ button: classes.approveButton }}
            />
        )
    }

    return <>{children}</>
}
