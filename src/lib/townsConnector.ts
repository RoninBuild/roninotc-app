import { createConnector } from 'wagmi'
import sdk from '@farcaster/miniapp-sdk'
import { getAddress } from 'viem'

export function townsConnector() {
    return createConnector((config) => ({
        id: 'towns',
        name: 'Towns Wallet',
        type: 'towns',

        async connect(parameters) {
            try {
                const provider = await sdk.wallet.getEthereumProvider()
                if (!provider) throw new Error('Towns provider not found')

                // Prioritize eth_accounts to avoid unnecessary permission prompts if already authorized
                let accounts = (await provider.request({
                    method: 'eth_accounts',
                })) as string[]

                if (!accounts || accounts.length === 0) {
                    accounts = (await provider.request({
                        method: 'eth_requestAccounts',
                    })) as string[]
                }

                const currentChainId = await this.getChainId()

                return {
                    accounts: accounts.map((x) => getAddress(x)),
                    chainId: currentChainId,
                } as any
            } catch (error) {
                console.error('Towns connector connection failed', error)
                throw error
            }
        },

        async disconnect() {
            // Towns wallet doesn't really "disconnect" but we can simulates it
        },

        async getAccounts() {
            const provider = await sdk.wallet.getEthereumProvider()
            if (!provider) return []
            const accounts = (await provider.request({
                method: 'eth_accounts',
            })) as string[]
            return accounts.map((x) => getAddress(x))
        },

        async getChainId() {
            const provider = await sdk.wallet.getEthereumProvider()
            if (!provider) return 8453 // Default to Base
            const chainId = (await provider.request({
                method: 'eth_chainId',
            })) as string
            return Number(chainId)
        },

        async getProvider() {
            return await sdk.wallet.getEthereumProvider()
        },

        async isAuthorized() {
            // In Towns, we are always effectively authorized if the SDK is loaded
            try {
                const accounts = await this.getAccounts()
                return !!accounts.length
            } catch {
                return false
            }
        },

        onAccountsChanged(accounts) {
            config.emitter.emit('change', {
                accounts: accounts.map((x) => getAddress(x)),
            })
        },

        onChainChanged(chain) {
            const chainId = Number(chain)
            config.emitter.emit('change', { chainId })
        },

        onDisconnect() {
            config.emitter.emit('disconnect')
        },
    }))
}
