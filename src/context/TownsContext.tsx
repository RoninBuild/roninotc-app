// Towns Native Integration - Verified Implementation
// Last Updated: 2026-02-05
'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import sdk from '@farcaster/miniapp-sdk'
import { useConnect, useAccount, useDisconnect } from 'wagmi'

interface TownsContextType {
    isTowns: boolean
    townsAddress: string | null // The Smart Wallet (from Provider or Hint)
    setTownsAddress: (addr: string | null) => void // Allow manual override from deal data
    identityAddress: string | null // The Identity ID (from Context)
    userDisplayName: string | null
    pfpUrl: string | null
    channelId: string | null
    townsUserId: string | null
    isLoading: boolean
    sdkReady: boolean
    contextReady: boolean
    rawContext: any | null // For debugging
}

const TownsContext = createContext<TownsContextType>({
    isTowns: false,
    townsAddress: null,
    setTownsAddress: () => { },
    identityAddress: null,
    userDisplayName: null,
    pfpUrl: null,
    channelId: null,
    townsUserId: null,
    isLoading: true,
    sdkReady: false,
    contextReady: false,
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
    const [sdkReady, setSdkReady] = useState(false)
    const [contextReady, setContextReady] = useState(false)
    const [rawContext, setRawContext] = useState<any | null>(null)
    const initialized = useRef(false)

    useEffect(() => {
        if (initialized.current) return
        initialized.current = true

        async function init() {
            try {
                // 1. Signal Ready
                sdk.actions.ready()
                setSdkReady(true)

                // 2. Fetch Capabilities
                let capabilities: string[] = []
                try {
                    const actions = sdk.actions as any
                    if (actions.getCapabilities) {
                        capabilities = await actions.getCapabilities()
                    }
                } catch (e) {
                    console.warn('Towns: getCapabilities check failed', e)
                }

                // 3. Fetch Context
                const context = (await sdk.context) as any
                console.log('Towns: Full SDK Context:', context)
                setRawContext(context)
                setContextReady(true)

                // 4. Identify Environment
                const hasTownsField = !!context?.towns
                const hasTownsCapability = capabilities.includes('towns')

                if (hasTownsField || hasTownsCapability) {
                    console.log('Towns: Environment confirmed.')
                    setIsTowns(true)

                    const townsUser = context.towns?.user
                    setIdentityAddress(townsUser?.address || null)
                    setTownsUserId(townsUser?.userId || null)

                    // Also try to get the wallet address from location/context directly as fallback
                    const contextWallet = context.location?.walletAddress || context.walletAddress || townsUser?.address
                    if (contextWallet) setTownsAddress(contextWallet)

                    // Robust identity fallback chain
                    const displayName = context.user?.displayName ||
                        context.user?.username ||
                        townsUser?.displayName ||
                        townsUser?.username ||
                        'Towns User'

                    const ipfsToHttps = (url: string | null | undefined) => {
                        if (!url) return null
                        if (url.startsWith('ipfs://')) {
                            return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
                        }
                        return url
                    }

                    const pfpChain = ipfsToHttps(context.user?.pfpUrl) ||
                        ipfsToHttps(context.user?.photoUrl) ||
                        ipfsToHttps(townsUser?.profileImageUrl) ||
                        null

                    setUserDisplayName(displayName)
                    setPfpUrl(pfpChain)

                    // Robust channelId extraction
                    const extractedChannelId = context.channelId ||
                        context.location?.channelId ||
                        context.towns?.channelId ||
                        (context.location as any)?.conversationId ||
                        null

                    setChannelId(extractedChannelId)

                    // Get Wallet Address from SDK (The real Smart Wallet)
                    try {
                        const provider = await sdk.wallet.getEthereumProvider()
                        if (provider) {
                            let accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
                            if (!accounts || accounts.length === 0) {
                                accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
                            }
                            if (accounts && accounts.length > 0) {
                                console.log('Towns: Wallet address found via provider:', accounts[0])
                                setTownsAddress(accounts[0])
                            }
                        } else {
                            // Fallback to context fields if provider fails
                            const fallback = context.walletAddress || context.user?.walletAddress || context.location?.walletAddress || townsUser?.address
                            console.log('Towns: Using fallback wallet address:', fallback)
                            if (fallback) setTownsAddress(fallback)
                        }
                    } catch (e) {
                        console.error('Towns: Provider account fetch failed', e)
                        const fallback = context.walletAddress || context.user?.walletAddress || context.location?.walletAddress || townsUser?.address
                        if (fallback) setTownsAddress(fallback)
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





    return (
        <TownsContext.Provider value={{
            isTowns,
            townsAddress,
            setTownsAddress,
            identityAddress,
            userDisplayName,
            pfpUrl,
            channelId,
            townsUserId,
            isLoading,
            sdkReady,
            contextReady,
            rawContext
        }}>
            {children}
        </TownsContext.Provider>
    )
}

export function TownsConnectionEnforcer() {
    const { isTowns, townsAddress, isLoading } = useTowns()
    const { connectAsync, connectors } = useConnect()
    const { address, connector, isConnected } = useAccount()
    const { disconnectAsync } = useDisconnect()

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

    return null
}
