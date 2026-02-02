'use client'

import { useEffect } from 'react'
import sdk from '@farcaster/miniapp-sdk'

export function TownsProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const init = async () => {
            try {
                await sdk.actions.ready()
                console.log('Towns SDK signaled ready')
            } catch (error) {
                console.error('Failed to signal ready to Towns SDK:', error)
            }
        }
        init()
    }, [])

    return <>{children}</>
}
