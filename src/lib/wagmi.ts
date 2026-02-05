import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet
} from '@rainbow-me/rainbowkit/wallets'
import { townsConnector } from './townsConnector'

// Browser config with all connectors
const browserConnectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        rainbowWallet,
        metaMaskWallet,
        coinbaseWallet,
      ],
    },
  ],
  {
    appName: 'RoninOTC',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  }
)

// Towns-only config (NO external wallets)
export const townsWagmiConfig = createConfig({
  connectors: [townsConnector()], // ONLY Towns connector
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
})

// Browser config (with RainbowKit wallets)
export const browserWagmiConfig = createConfig({
  connectors: [townsConnector(), ...browserConnectors],
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
})

// Default export for backwards compatibility
export const wagmiConfig = browserWagmiConfig
