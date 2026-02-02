'use client'

import { useEffect } from 'react'
import sdk from '@farcaster/miniapp-sdk'
import { useConnect, useAccount } from 'wagmi'

export function TownsProvider({ children }: { children: React.ReactNode }) {
    const { connect, connectors } = useConnect()
    const { isConnected } = useAccount()

    useEffect(() => {
        const init = async () => {
            try {
                // Signal ready to Towns
                await sdk.actions.ready()
                console.log('Towns SDK signaled ready')

                // Check if we are in Towns and not connected
                if (!isConnected) {
                    const towns = connectors.find((c) => c.id === 'towns')
                    if (towns) {
                        console.log('Auto-connecting to Towns wallet...')
                        connect({ connector: towns })
                    }
                }
            } catch (error) {
                console.error('Failed to init Towns integration:', error)
            }
        }
        init()
    }, [connect, connectors, isConnected])

    return <>{children}</>
}
