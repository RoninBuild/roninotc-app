'use client'

/**
 * Early Towns detection (synchronous, before SDK init)
 * This runs before React hydration to determine which Wagmi config to use
 */
export function detectTownsEnvironment(): boolean {
    if (typeof window === 'undefined') return false

    // Check URL parameters
    const params = new URLSearchParams(window.location.search)
    if (params.has('towns') || params.has('miniapp')) return true

    // Check if we're in an iframe (Towns mini-apps run in iframes)
    if (window.self !== window.top) return true

    // Check user agent or other indicators
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('towns')) return true

    // Default to false (browser mode)
    return false
}
