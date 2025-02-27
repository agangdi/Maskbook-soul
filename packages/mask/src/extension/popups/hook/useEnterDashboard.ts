// ! We're going to SSR this UI, so DO NOT import anything new!
import { useCallback } from 'react'

export const useEnterDashboard = () => {
    return useCallback((event: React.MouseEvent) => {
        if (event.shiftKey) {
            browser.tabs.create({
                active: true,
                url: browser.runtime.getURL('/debug.html'),
            })
        } else {
            browser.tabs.create({
                active: true,
                url: browser.runtime.getURL('/dashboard.html'),
            })
        }
    }, [])
}
