'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import sdk from '@farcaster/miniapp-sdk'
import { useConnect, useAccount } from 'wagmi'

interface TownsContextType {
    isTowns: boolean
    townsAddress: string | null
    userDisplayName: string | null
    isLoading: boolean
}

const TownsContext = createContext<TownsContextType>({
    isTowns: false,
    townsAddress: null,
    userDisplayName: null,
    isLoading: true,
})

export function useTowns() {
    return useContext(TownsContext)
}

interface ExtendedMiniAppContext {
    user?: {
        displayName?: string
        username?: string
        pfpUrl?: string
    }
    client?: {
        clientName?: string
    }
    towns?: {
        user?: {
            address?: string
            username?: string
        }
        spaceId?: string
    }
}

export function TownsProvider({ children }: { children: React.ReactNode }) {
    const [isTowns, setIsTowns] = useState(false)
    const [townsAddress, setTownsAddress] = useState<string | null>(null)
    const [userDisplayName, setUserDisplayName] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const initialized = useRef(false)

    const { connect, connectors } = useConnect()

    useEffect(() => {
        if (initialized.current) return
        initialized.current = true

        async function init() {
            try {
                // 1. Signal Ready (Critical)
                sdk.actions.ready()

                // 2. Fetch Capabilities (Verification)
                try {
                    // @ts-ignore - getCapabilities might be missing in types but present in runtime or polyfilled
                    if (sdk.actions.getCapabilities) {
                        // @ts-ignore
                        await sdk.actions.getCapabilities()
                    }
                } catch (e) {
                    console.warn('Towns: getCapabilities check failed', e)
                }

                // 3. Fetch Context & Identify Environment
                // sdk.context is a Promise in newer versions
                const context = (await sdk.context) as unknown as ExtendedMiniAppContext

                // Strict Detection: Must have towns user address
                if (context?.towns?.user?.address) {
                    console.log('Towns environment detected', context.towns)

                    setIsTowns(true)
                    setTownsAddress(context.towns.user.address)
                    setUserDisplayName(context.user?.displayName || context.towns.user.username || 'Towns User')

                    // 4. Auto-Connect
                    // Only connect if we found the specific Towns connector
                    const townsConnector = connectors.find(c => c.id === 'towns')

                    if (townsConnector) {
                        console.log('Connecting to Towns Wallet...')
                        connect({ connector: townsConnector })
                    } else {
                        console.error('Towns Connector not found in Wagmi config')
                    }
                }
            } catch (err) {
                console.error('Towns Context Init Error', err)
            } finally {
                setIsLoading(false)
            }
        }

        init()
    }, [connect, connectors])

    return (
        <TownsContext.Provider value={{ isTowns, townsAddress, userDisplayName, isLoading }}>
            {children}
        </TownsContext.Provider>
    )
}
