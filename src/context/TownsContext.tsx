'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import sdk from '@farcaster/miniapp-sdk'
import { useConnect, useAccount, useDisconnect } from 'wagmi'

interface TownsContextType {
    isTowns: boolean
    townsAddress: string | null
    userDisplayName: string | null
    pfpUrl: string | null
    isLoading: boolean
}

const TownsContext = createContext<TownsContextType>({
    isTowns: false,
    townsAddress: null,
    userDisplayName: null,
    pfpUrl: null,
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
    const [pfpUrl, setPfpUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const initialized = useRef(false)

    const { connectAsync, connectors } = useConnect()
    const { address, connector, isConnected } = useAccount()
    const { disconnectAsync } = useDisconnect()

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
                    setPfpUrl(context.user?.pfpUrl || null)
                }
            } catch (err) {
                console.error('Towns Context Init Error', err)
            } finally {
                setIsLoading(false)
            }
        }

        init()
    }, [])

    // 4. Force Connection Effect
    useEffect(() => {
        if (isLoading || !isTowns || !townsAddress) return

        async function enforceConnection() {
            const currentAddress = address?.toLowerCase()
            const targetAddress = townsAddress?.toLowerCase()
            const currentConnectorId = connector?.id

            const isWrongConnector = currentConnectorId !== 'towns'
            const isWrongAddress = currentAddress !== targetAddress

            if (!isConnected || isWrongConnector || isWrongAddress) {
                console.log('Towns: Connection enforcement triggered.', {
                    isConnected,
                    isWrongConnector,
                    isWrongAddress,
                    currentAddress,
                    targetAddress
                })

                if (isConnected) {
                    console.log('Towns: Disconnecting old session...')
                    await disconnectAsync()
                }

                const townsConnector = connectors.find(c => c.id === 'towns')
                if (townsConnector) {
                    console.log('Towns: Connecting to Towns Wallet...')
                    try {
                        await connectAsync({ connector: townsConnector })
                        console.log('Towns: Connected successfully.')
                    } catch (e) {
                        console.error('Towns: Connection failed', e)
                    }
                } else {
                    console.error('Towns Connector not found in Wagmi config')
                }
            }
        }

        enforceConnection()
    }, [isLoading, isTowns, townsAddress, address, connector, isConnected, connectors, connectAsync, disconnectAsync])

    return (
        <TownsContext.Provider value={{ isTowns, townsAddress, userDisplayName, pfpUrl, isLoading }}>
            {children}
        </TownsContext.Provider>
    )
}
