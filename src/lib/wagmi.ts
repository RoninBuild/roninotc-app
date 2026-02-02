import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { townsConnector } from './towns-connector'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet
} from '@rainbow-me/rainbowkit/wallets'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        () => ({
          id: 'towns',
          name: 'Towns Wallet',
          iconUrl: 'https://roninotc-app.vercel.app/logo.png',
          iconBackground: '#0b0618',
          createConnector: townsConnector,
        }),
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

export const wagmiConfig = createConfig({
  connectors,
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
})
