'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import sdk from '@farcaster/miniapp-sdk'
import { useConnect, useAccount, useDisconnect } from 'wagmi'

interface TownsContextType {
    isTowns: boolean
    townsAddress: string | null // The Smart Wallet (from Provider)
    identityAddress: string | null // The Identity ID (from Context)
    userDisplayName: string | null
    pfpUrl: string | null
    channelId: string | null
    townsUserId: string | null
    isLoading: boolean
    rawContext: ExtendedMiniAppContext | null // For debugging
}

const TownsContext = createContext<TownsContextType>({
    isTowns: false,
    townsAddress: null,
    identityAddress: null,
    userDisplayName: null,
    pfpUrl: null,
    channelId: null,
    townsUserId: null,
    isLoading: true,
    rawContext: null,
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
    channelId?: string
    towns?: {
        user?: {
            address?: string
            userId?: string
            displayName?: string
            profileImageUrl?: string
            username?: string
        }
        spaceId?: string
    }
}

export function TownsProvider({ children }: { children: React.ReactNode }) {
    const [isTowns, setIsTowns] = useState(false)
    const [townsAddress, setTownsAddress] = useState<string | null>(null)
    const [identityAddress, setIdentityAddress] = useState<string | null>(null)
    const [userDisplayName, setUserDisplayName] = useState<string | null>(null)
    const [pfpUrl, setPfpUrl] = useState<string | null>(null)
    const [channelId, setChannelId] = useState<string | null>(null)
    const [townsUserId, setTownsUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [rawContext, setRawContext] = useState<ExtendedMiniAppContext | null>(null)
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
                    // @ts-ignore
                    if (sdk.actions.getCapabilities) await sdk.actions.getCapabilities()
                } catch (e) { console.warn('Towns: getCapabilities check failed', e) }

                // 3. Fetch Context
                const context = (await sdk.context) as unknown as ExtendedMiniAppContext
                console.log('Towns: Full SDK Context:', context)
                setRawContext(context) // Store for debugging

                // 4. Identify Environment and Fetch REAL Wallet Address from Provider
                if (context?.towns?.user?.address) {
                    console.log('Towns: Environment detected via context.')
                    setIsTowns(true)
                    setIdentityAddress(context.towns.user.address)
                    setTownsUserId(context.towns.user.userId || null)

                    // Correct identity source: context.towns.user
                    setUserDisplayName(context.towns.user.displayName || context.user?.displayName || context.towns.user.username || 'Towns User')
                    setPfpUrl(context.towns.user.profileImageUrl || context.user?.pfpUrl || null)

                    setChannelId(context.channelId || null)

                    // Get Wallet Address from SDK Provider (The Towns "Smart Wallet")
                    try {
                        const provider = await sdk.wallet.getEthereumProvider()
                        if (provider) {
                            console.log('Towns: Fetching accounts from provider...')
                            let accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
                            if (!accounts || accounts.length === 0) {
                                accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
                            }
                            if (accounts && accounts.length > 0) {
                                console.log('Towns: Smart Wallet detected:', accounts[0])
                                setTownsAddress(accounts[0])
                            } else {
                                console.warn('Towns: No accounts returned from provider. Falling back to context address.')
                                setTownsAddress(context.towns.user.address)
                            }
                        }
                    } catch (e) {
                        console.error('Towns: Failed to fetch accounts from provider', e)
                        setTownsAddress(context.towns.user.address)
                    }
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
        <TownsContext.Provider value={{ isTowns, townsAddress, identityAddress, userDisplayName, pfpUrl, channelId, townsUserId, isLoading, rawContext }}>
            {children}
        </TownsContext.Provider>
    )
}
