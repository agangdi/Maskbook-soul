import { useState } from 'react'
import { Tab, Tabs, Card, Typography, Button, Box } from '@mui/material'
import { makeStyles } from '@masknet/theme'
import { TabContext, TabPanel } from '@mui/lab'
import { TimelineView } from './TimelineView'
import { GameStatsView } from './GameStatsView'
import { OtherPlayersView } from './OtherPlayersView'
import { PersonalView } from './PersonalView'
import { useGameContractAddress, useGameInfo } from '../hooks/useGameInfo'
import type { GameMetaData, GoodGhostingInfo } from '../types'
import { usePoolAssets, usePoolData } from '../hooks/usePoolData'
import { useOtherPlayerInfo } from '../hooks/useOtherPlayerInfo'
import { TimelineTimer } from './TimelineTimer'
import { useI18N } from '../../../utils'
import { EthereumChainBoundary } from '../../../web3/UI/EthereumChainBoundary'
import { ChainId } from '@masknet/web3-shared-evm'

const useStyles = makeStyles()((theme) => ({
    root: {
        padding: theme.spacing(2),
    },
    tabs: {
        height: 'var(--tabHeight)',
        width: '100%',
        minHeight: 'unset',
        display: 'flex',
    },
    tab: {
        flex: 1,
        height: 'var(--tabHeight)',
        minHeight: 'unset',
        minWidth: 'unset',
    },
    gameName: {
        textAlign: 'center',
    },
    retry: {
        backgroundColor: theme.palette.maskColor.dark,
        color: 'white',
        '&:hover': {
            backgroundColor: theme.palette.maskColor.dark,
        },
        width: 254,
        margin: 16,
    },
}))

enum GoodGhostingTab {
    Game = 'Game',
    Timeline = 'Timeline',
    Personal = 'Personal',
    Everyone = 'Everyone',
}

interface PreviewCardProps {
    id: string
}

export function PreviewCard(props: PreviewCardProps) {
    const { value: addressInfo, error, loading, retry } = useGameContractAddress(props.id)
    const { t } = useI18N()
    const { classes } = useStyles()

    if (loading) {
        return <Typography color="textPrimary">{t('loading')}</Typography>
    }

    if (error || !addressInfo?.contractAddress) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center">
                <Typography color="error">{t('go_wrong')}</Typography>
                <Button className={classes.retry} size="small" onClick={retry}>
                    {t('retry')}
                </Button>
            </Box>
        )
    }
    return <PreviewCardWithGameAddress gameData={addressInfo} />
}

interface PreviewCardWithGameAddressProps {
    gameData: GameMetaData
}

export function PreviewCardWithGameAddress(props: PreviewCardWithGameAddressProps) {
    const { value: info, error, loading, retry } = useGameInfo(props.gameData)
    const { t } = useI18N()
    const { classes } = useStyles()

    if (loading) {
        return (
            <Typography color="textPrimary" textAlign="center" sx={{ padding: 2 }}>
                {t('loading')}
            </Typography>
        )
    }

    if (error || !info) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center">
                <Typography color="error">{t('go_wrong')}</Typography>
                <Button className={classes.retry} size="small" onClick={retry}>
                    {t('retry')}
                </Button>
            </Box>
        )
    }

    return <PreviewCardWithGameInfo info={info} />
}

interface PreviewCardWithGameInfoProps {
    info: GoodGhostingInfo
}

function PreviewCardWithGameInfo(props: PreviewCardWithGameInfoProps) {
    const { classes } = useStyles()
    const [activeTab, setActiveTab] = useState(GoodGhostingTab.Game)

    const finDataResult = usePoolData(props.info)
    const otherPlayerResult = useOtherPlayerInfo(props.info)
    const poolAssetsResult = usePoolAssets()

    const tabs = [GoodGhostingTab.Game, GoodGhostingTab.Timeline, GoodGhostingTab.Everyone]
    if (props.info.currentPlayer) tabs.push(GoodGhostingTab.Personal)

    return (
        <>
            <Card variant="outlined" className={classes.root} elevation={0}>
                {props.info.gameName && (
                    <Typography className={classes.gameName} variant="h6" color="textPrimary">
                        {props.info.gameName}
                    </Typography>
                )}
                <TimelineTimer info={props.info} />
                <TabContext value={activeTab}>
                    <Tabs className={classes.tabs} value={activeTab} onChange={(event, tab) => setActiveTab(tab)}>
                        {tabs.map((tab) => (
                            <Tab className={classes.tab} key={tab} value={tab} label={tab} />
                        ))}
                    </Tabs>
                    <TabPanel value={GoodGhostingTab.Game} sx={{ flex: 1 }}>
                        <GameStatsView
                            info={props.info}
                            finDataResult={finDataResult}
                            otherPlayerResult={otherPlayerResult}
                            poolAssetsResult={poolAssetsResult}
                        />
                    </TabPanel>
                    <TabPanel value={GoodGhostingTab.Timeline} sx={{ flex: 1 }}>
                        <TimelineView info={props.info} />
                    </TabPanel>
                    <TabPanel value={GoodGhostingTab.Everyone} sx={{ flex: 1 }}>
                        <OtherPlayersView info={props.info} otherPlayerResult={otherPlayerResult} />
                    </TabPanel>
                    {props.info.currentPlayer && (
                        <TabPanel value={GoodGhostingTab.Personal} sx={{ flex: 1 }}>
                            <PersonalView info={props.info} />
                        </TabPanel>
                    )}
                </TabContext>
            </Card>
            <Box sx={{ padding: 1.5 }}>
                <EthereumChainBoundary chainId={ChainId.Matic} renderInTimeline />
            </Box>
        </>
    )
}
