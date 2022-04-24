import { PostIdentifier, ProfileIdentifier } from '@masknet/shared-base'
import { openWindow } from '@masknet/shared-base-ui'
import urlcat from 'urlcat'
import { isAndroidApp } from '../../../shared'
import type { SocialNetwork } from '../../social-network/types'
import { createSNSAdaptorSpecializedPostContext } from '../../social-network/utils/create-post-context'
import { deconstructPayload } from '../../utils'
import { twitterBase } from './base'
import { TwitterDecoder, __TwitterEncoder } from '@masknet/encryption'
import { usernameValidator } from './utils/user'

const twitterUrl = isAndroidApp ? 'https://mobile.twitter.com/' : 'https://twitter.com/'

const getPostURL = (post: PostIdentifier): URL | null => {
    if (!(post.identifier instanceof ProfileIdentifier)) return null
    return new URL(`${twitterUrl}${post.identifier.userId}/status/${post.postId}`)
}
export const twitterShared: SocialNetwork.Shared & SocialNetwork.Base = {
    ...twitterBase,
    utils: {
        getHomePage: () => twitterUrl,
        getProfilePage: (userId) => `${twitterUrl}${userId}`,
        isValidUsername: usernameValidator,
        textPayloadPostProcessor: {
            encoder: __TwitterEncoder,
            decoder(text) {
                return TwitterDecoder(text)
                    .map((x) => [x])
                    .unwrapOr([])
            },
        },
        getPostURL,
        share(text) {
            const url = this.getShareLinkURL!(text)
            if (isAndroidApp) {
                location.assign(url)
                return
            }

            const width = 700
            const height = 520
            const openedWindow = openWindow(url, 'share', {
                width,
                height,
                screenX: window.screenX + (window.innerWidth - width) / 2,
                screenY: window.screenY + (window.innerHeight - height) / 2,
                opener: true,
                referrer: true,
                behaviors: {
                    toolbar: true,
                    status: true,
                    resizable: true,
                    scrollbars: true,
                },
            })
            if (openedWindow === null) {
                location.assign(url)
            }
        },
        getShareLinkURL(message) {
            const url = urlcat(isAndroidApp ? `${twitterUrl}compose/tweet` : `${twitterUrl}intent/tweet`, {
                text: message,
            })
            return new URL(url)
        },
        createPostContext: createSNSAdaptorSpecializedPostContext({
            payloadParser: deconstructPayload,
            payloadDecoder: (x) =>
                TwitterDecoder(x)
                    .map((x) => [x])
                    .unwrapOr([]),
            getURLFromPostIdentifier: getPostURL,
        }),
    },
}
