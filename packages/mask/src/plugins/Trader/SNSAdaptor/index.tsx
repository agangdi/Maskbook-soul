import type { Plugin } from '@masknet/plugin-infra'
import { base } from '../base'
import { TraderDialog } from './trader/TraderDialog'
import { SearchResultInspector } from './trending/SearchResultInspector'
import { useRemoteControlledDialog } from '@masknet/shared-base-ui'
import { Trans } from 'react-i18next'
import { TagInspector } from './trending/TagInspector'
import { enhanceTag } from './cashTag'
import { ApplicationEntry } from '@masknet/shared'
import { SwapColorfulIcon } from '@masknet/icons'
import { PluginTraderMessages } from '../messages'
import { setupStorage, storageDefaultValue } from '../storage'
import type { ChainId } from '@masknet/web3-shared-evm'

const sns: Plugin.SNSAdaptor.Definition<
    ChainId,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
> = {
    ...base,
    init(signal, context) {
        setupStorage(context.createKVStorage('persistent', storageDefaultValue))
    },
    SearchResultBox: SearchResultInspector,
    GlobalInjection: function Component() {
        return (
            <>
                <TagInspector />
                <TraderDialog />
            </>
        )
    },
    enhanceTag,
    ApplicationEntries: [
        (() => {
            const icon = <SwapColorfulIcon />
            const name = <Trans i18nKey="plugin_trader_swap" />
            const iconFilterColor = 'rgba(247, 147, 30, 0.3)'
            return {
                ApplicationEntryID: base.ID,
                RenderEntryComponent(EntryComponentProps) {
                    const { openDialog } = useRemoteControlledDialog(PluginTraderMessages.swapDialogUpdated)

                    return (
                        <ApplicationEntry
                            {...EntryComponentProps}
                            title={name}
                            icon={icon}
                            iconFilterColor={iconFilterColor}
                            onClick={EntryComponentProps.onClick ?? openDialog}
                        />
                    )
                },
                appBoardSortingDefaultPriority: 9,
                marketListSortingPriority: 5,
                icon,
                category: 'dapp',
                name,
                tutorialLink: 'https://realmasknetwork.notion.site/f2e7d081ee38487ca1db958393ac1edc',
                description: <Trans i18nKey="plugin_trader_swap_description" />,
                iconFilterColor,
            }
        })(),
    ],
    wrapperProps: {
        icon: (
            <SwapColorfulIcon
                style={{ width: 24, height: 24, filter: 'drop-shadow(0px 6px 12px rgba(254, 156, 0, 0.2))' }}
            />
        ),
        backgroundGradient:
            'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.8) 100%), linear-gradient(90deg, rgba(28, 104, 243, 0.2) 0%, rgba(254, 156, 0, 0.2) 100%), #FFFFFF;',
    },
}

export default sns
