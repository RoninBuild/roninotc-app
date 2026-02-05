'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { townsWagmiConfig, browserWagmiConfig } from '@/lib/wagmi'
import { TownsProvider, useTowns } from '@/context/TownsContext'
import { useMemo } from 'react'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TownsProvider>
        <WagmiWrappedProviders>
          {children}
        </WagmiWrappedProviders>
      </TownsProvider>
    </QueryClientProvider>
  )
}

function WagmiWrappedProviders({ children }: { children: React.ReactNode }) {
  const { isTowns, contextReady } = useTowns()

  // Defer rendering Wagmi and RainbowKit until we know the environment
  if (!contextReady) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-500 font-black uppercase tracking-[0.3em] animate-pulse">Initializing Towns</p>
        </div>
      </div>
    )
  }

  // Select appropriate Wagmi config based on REAL environment
  const config = isTowns ? townsWagmiConfig : browserWagmiConfig

  console.log('Providers: SDK Ready. Mode:', isTowns ? 'TOWNS' : 'BROWSER')

  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: '#7b3ff2',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  )
}