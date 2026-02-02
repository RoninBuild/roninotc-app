import { sdk } from '@farcaster/miniapp-sdk'
import { createConnector } from 'wagmi'
import {
    type Address,
    custom,
    SwitchChainError,
    numberToHex,
    createPublicClient,
    http
} from 'viem'

export function townsConnector() {
    return createConnector((config) => ({
        id: 'towns',
        name: 'Towns Wallet',
        type: 'towns',
        async connect<withCapabilities extends boolean = false>(params: {
            chainId?: number;
            isReconnecting?: boolean;
            withCapabilities?: withCapabilities;
        } = {}) {
            const { chainId } = params
            try {
                const provider = await sdk.wallet.getEthereumProvider()
                if (!provider) throw new Error('Towns provider not found')

                // Ensure requested chain is supported/selected if provided
                if (chainId) {
                    try {
                        await provider.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: numberToHex(chainId) }],
                        })
                    } catch (error) {
                        console.error('Failed to switch chain:', error)
                    }
                }

                const accounts = await provider.request({ method: 'eth_accounts' }) as Address[]
                const currentChainId = await provider.request({ method: 'eth_chainId' }) as string

                return {
                    accounts: accounts as any,
                    chainId: parseInt(currentChainId, 16),
                }
            } catch (error) {
                console.error('Towns connect error:', error)
                throw error
            }
        },
        async disconnect() {
            // Towns SDK doesn't have a manual disconnect for the injected provider
        },
        async getAccounts() {
            const provider = await sdk.wallet.getEthereumProvider()
            if (!provider) return []
            return await provider.request({ method: 'eth_accounts' }) as Address[]
        },
        async getChainId() {
            const provider = await sdk.wallet.getEthereumProvider()
            if (!provider) throw new Error('Towns provider not found')
            const chainId = await provider.request({ method: 'eth_chainId' }) as string
            return parseInt(chainId, 16)
        },
        async getProvider() {
            const provider = await sdk.wallet.getEthereumProvider()
            if (!provider) throw new Error('Towns provider not found')
            return provider
        },
        async isAuthorized() {
            try {
                const provider = await sdk.wallet.getEthereumProvider()
                if (!provider) return false
                const accounts = await provider.request({ method: 'eth_accounts' }) as Address[]
                return accounts.length > 0
            } catch {
                return false
            }
        },
        async switchChain({ chainId }) {
            const provider = await this.getProvider()
            if (!provider) throw new Error('Provider not found')

            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: numberToHex(chainId) }],
                })
                return config.chains.find((x) => x.id === chainId) ?? { id: chainId } as any
            } catch (error: any) {
                if (error.code === 4902) throw new SwitchChainError(error)
                throw error
            }
        },
        onAccountsChanged(accounts) {
            if (accounts.length === 0) config.emitter.emit('disconnect')
            else config.emitter.emit('change', { accounts: accounts as Address[] })
        },
        onChainChanged(chainId) {
            config.emitter.emit('change', { chainId: parseInt(chainId as string, 16) })
        },
        onDisconnect() {
            config.emitter.emit('disconnect')
        },
    }))
}
