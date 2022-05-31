import { MutationObserverWatcher, DOMProxy, LiveSelector } from '@dimensiondev/holoflows-kit'
import { bioPageUserNickNameSelector, floatingBioCardSelector, bioPageUserIDSelector } from '../utils/selector'
import type { PostInfo } from '@masknet/plugin-infra/content-script'
import Services from '../../../extension/service'
import { EnhanceableSite, ProfileIdentifier } from '@masknet/shared-base'
import { MaskIcon } from '../../../resources/MaskIcon'
import { createReactRootShadowed } from '../../../utils/shadow-root/renderInShadowRoot'
import { memoizePromise } from '@dimensiondev/kit'
import { startWatch } from '../../../utils/watcher'
import Tooltip from '@mui/material/Tooltip'

function Icon(props: { size: number }) {
    return (
        <MaskIcon
            size={props.size}
            style={{
                verticalAlign: 'text-bottom',
                marginLeft: 6,
            }}
        />
    )
}

function HolderBadge(t: any) {
    return `<div style="margin-top: 20px; display: flex;">
                <div style="display:flex;">
                    <img style="border-radius: 50px" src="${t.twitter_avatar}" width="48" height="48" />
                    <div style="display: flex; flex-direction: column; margin-left: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: black; font-weight: bold;">
                                    ${t.twitter_nickname}
                                </div>
                                <div>
                                    <a style="text-decoration: none; color: gray;" href="/${t.twitter_user_id}">
                                        @${t.twitter_user_id}
                                    </a>
                                </div>
                            </div>
                            <div>
                                <span style="display:init-block; cursor: pointer; background: black; color: white; padding: 5px 10px; border-radius: 20px">
                                    Follow
                                </span>
                            </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 12px; color: #333333;">
                            WEB 3.0 CONTRIBUTORWEB 3.0 CONTRIBUTORWEB 3.0 CONTRIBUTORWEB 3.0 CONTRIBUTOR
                        </div>
                    </div>
                </div>
            </div>`
}

function Badge({ v }: { v: any }) {
    const el: any = document.querySelector('#soul-holder')
    console.log({ el, v })
    return (
        <div
            style={{
                position: 'relative',
            }}
            onMouseEnter={(e: any) => {
                e.stopPropagation()
            }}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
            }}>
            <Tooltip
                onMouseEnter={(e: any) => {
                    e.stopPropagation()
                }}
                title={v.badge_name}
                placement="top-end"
                arrow>
                <img
                    src={v.badge_icon}
                    width="24"
                    height="24"
                    className="collectionImg"
                    onClick={async (e: any) => {
                        e.preventDefault()
                        e.stopPropagation()

                        let holder = `<div style="display: flex; align-items: center;">
                            <span style="cursor: pointer;" id="close-soul" >
                                X
                            </span>
                            <span style="margin-left: 50px;">${v.badge_name}</span>
                            <span style="margin-left: 20px;">
                                <img
                                    src="${v.badge_icon}"
                                    width="24"
                                    height="24"
                                />
                            </span>
                        </div>`
                        const _res = await fetch(
                            `https://soul.sustainablebtc.org/get_twitters_by_badge?badge_address=${v.badge_address}`,
                        )
                        const data: any = await _res.json()
                        if (data.data.tts) {
                            data.data.tts.map((t: any, i: number) => {
                                if (t.twitter_user_id) holder += HolderBadge(t)
                            })
                        }
                        el.innerHTML = holder
                        el.style.display = 'block'
                        const cl: any = document.querySelector('#close-soul')
                        if (cl) {
                            cl.addEventListener('click', function () {
                                el.style.display = 'none'
                            })
                        }
                    }}
                />
            </Tooltip>
        </div>
    )
}

function Badges({ badges }: { badges: any }) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                overflow: 'visible',
                transform: 'none',
                perspective: 'none',
                filter: 'none',
            }}>
            {/* <Icon size={24} /> */}
            {badges.map((v: any, i: number) => {
                return <Badge v={v} key={i} />
            })}
        </div>
    )
}

function _(main: () => LiveSelector<HTMLElement, true>, size: number, signal: AbortSignal) {
    // TODO: for unknown reason the MutationObserverWatcher doesn't work well
    // To reproduce, open a profile and switch to another profile.
    startWatch(
        new MutationObserverWatcher(main()).useForeach((ele, _, meta) => {
            let remover = () => {}
            const remove = () => remover()
            const check = () => {
                ifUsingMask(
                    ProfileIdentifier.of(EnhanceableSite.Twitter, bioPageUserIDSelector(main).evaluate()).unwrapOr(
                        null,
                    ),
                ).then(() => {
                    const root = createReactRootShadowed(meta.afterShadow, { signal })
                    root.render(<Icon size={size} />)
                    remover = root.destroy
                }, remove)
            }
            check()
            return {
                onNodeMutation: check,
                onTargetChanged: check,
                onRemove: remove,
            }
        }),
        signal,
    )
}

export function injectMaskUserBadgeAtTwitter(signal: AbortSignal) {
    // profile
    _(bioPageUserNickNameSelector, 24, signal)
    // floating bio
    _(floatingBioCardSelector, 20, signal)
}
export async function injectNFTBadgeToPostTwitter(post: PostInfo, signal: AbortSignal) {
    const account = localStorage.getItem('wallet_address')
    const userId = post.author.getCurrentValue()?.userId
    const avatar = post.avatarURL.getCurrentValue()?.href
    const nickname = post.nickname.getCurrentValue()
    const res = await fetch(
        `https://soul.sustainablebtc.org/get_badges_by_address?wallet_address=${account}&twitter_user_id=${userId}&twitter_avatar=${avatar}&twitter_nickname=${nickname}`,
        // `http://localhost:8080/get_badges_by_address?wallet_address=${account}&twitter_user_id=${userId}&twitter_avatar=${avatar}&twitter_nickname=${nickname}`,
    )
    let badges = await res.json()
    badges = badges.data

    if (!document.getElementById('soul-holder')) {
        const e = document.createElement('div')
        e.id = 'soul-holder'
        e.style.width = '400px'
        e.style.height = '600px'
        e.style.backgroundColor = 'white'
        e.style.position = 'fixed'
        e.style.top = '200px'
        e.style.right = '10%'
        e.style.zIndex = '10000'
        e.style.padding = '5px 10px'
        e.style.borderRadius = '5px'
        e.style.boxShadow = '2px 2px 2px 2px rgba(0, 0, 0, 0.2)'
        e.style.display = 'none'
        e.style.overflow = 'scroll'
        document.getElementsByTagName('body')[0].appendChild(e)
    }

    const ls = new LiveSelector([post.rootElement])
        .map((x) =>
            x.current.parentElement?.parentElement?.previousElementSibling?.querySelector<HTMLDivElement>(
                'a[role="link"] > div > div:first-child',
            ),
        )
        .enableSingleMode()
    ifUsingMask(post.author.getCurrentValue()).then(add, remove)
    post.author.subscribe(() => ifUsingMask(post.author.getCurrentValue()).then(add, remove))
    let remover = () => {}
    function add() {
        console.log('add', signal)
        if (signal?.aborted) return
        const node = ls.evaluate()
        if (!node) return
        const proxy = DOMProxy({ afterShadowRootInit: { mode: 'closed' } })
        proxy.realCurrent = node
        const root = createReactRootShadowed(proxy.afterShadow, { signal })
        root.render(<Badges badges={badges} />)
        remover = root.destroy
    }
    function remove() {
        remover()
    }
}
export const ifUsingMask = memoizePromise(
    async (pid: ProfileIdentifier | null) => {
        if (!pid) throw new Error()
        const p = await Services.Identity.queryProfilesInformation([pid])
        if (!p[0].linkedPersona?.rawPublicKey) throw new Error()
    },
    (x) => x,
)
