import { useState } from 'react'
import { getMaskColor, makeStyles, ShadowRootMenu } from '@masknet/theme'
import { MenuItem } from '@mui/material'
import { CollectionList } from '../../../extension/options-page/DashboardComponents/CollectibleList'
import { first, uniqBy } from 'lodash-unified'
import { ReversedAddress } from '@masknet/shared'
import type { IdentityAddress } from '@masknet/web3-shared-base'

const useStyles = makeStyles()((theme) => ({
    root: {
        position: 'relative',
    },
    text: {
        paddingTop: 36,
        paddingBottom: 36,
        '& > p': {
            color: getMaskColor(theme).textPrimary,
        },
    },
    note: {
        padding: `0 ${theme.spacing(1)}`,
        textAlign: 'right',
    },
    icon: {
        color: getMaskColor(theme).textPrimary,
    },
    iconContainer: {
        display: 'inherit',
    },
    tipList: {
        listStyleType: 'decimal',
        paddingLeft: 16,
    },
    button: {
        border: `1px solid ${theme.palette.text.primary} !important`,
        color: `${theme.palette.text.primary} !important`,
        borderRadius: 9999,
        background: 'transparent',
        '&:hover': {
            background: 'rgba(15, 20, 25, 0.1)',
        },
    },
}))

export interface NFTPageProps {
    addressNames?: IdentityAddress[]
}

export function NFTPage(props: NFTPageProps) {
    const { addressNames } = props
    const { classes } = useStyles()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const [selectedAddress, setSelectedAddress] = useState(first(addressNames))
    const onOpen = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)
    const onClose = () => setAnchorEl(null)
    const onSelect = (option: IdentityAddress) => {
        setSelectedAddress(option)
        onClose()
    }

    if (!selectedAddress) return null

    return (
        <div className={classes.root}>
            <ShadowRootMenu
                open={!!anchorEl}
                onClose={onClose}
                anchorEl={anchorEl}
                PaperProps={{ style: { maxHeight: 192 } }}>
                {uniqBy(addressNames ?? [], (x) => x.address.toLowerCase()).map((x) => {
                    return (
                        <MenuItem key={x.address} value={x.address} onClick={() => onSelect(x)}>
                            <ReversedAddress address={x.address} />
                        </MenuItem>
                    )
                })}
            </ShadowRootMenu>
            <CollectionList addressName={selectedAddress ?? undefined} onSelectAddress={onOpen} />
        </div>
    )
}
