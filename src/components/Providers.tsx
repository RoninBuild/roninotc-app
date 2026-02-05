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

  // During SSR or until context is confirmed, use browserWagmiConfig as default.
  // This ensures wagmi hooks (used in children) don't throw during build/prerendering.
  const config = (contextReady && isTowns) ? townsWagmiConfig : browserWagmiConfig

  console.log('Providers: SDK Status:', { contextReady, isTowns })

  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: '#7b3ff2',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}
      >
        {contextReady ? children : (
          <div className="fixed inset-0 bg-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-zinc-500 font-black uppercase tracking-[0.3em] animate-pulse">Initializing Towns</p>
            </div>
          </div>
        )}
      </RainbowKitProvider>
    </WagmiProvider>
  )
}