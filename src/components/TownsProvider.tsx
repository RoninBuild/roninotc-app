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
                console.log('Initializing Towns SDK...')
                await sdk.actions.ready()

                const context = (await sdk.context) as any
                console.log('Towns context received:', context)

                if (context?.towns && !isConnected) {
                    console.log('Towns environment detected. Available connectors:', connectors.map(c => `${c.id} (${c.name})`))

                    const townsConnector = connectors.find((c) => c.id === 'towns' || c.name.toLowerCase().includes('towns'))
                    if (townsConnector) {
                        console.log('Auto-connecting to Towns wallet via:', townsConnector.name)
                        connect({ connector: townsConnector })
                    } else {
                        console.warn('Towns connector NOT found in Wagmi config!')
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
