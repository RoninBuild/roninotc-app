'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { townsWagmiConfig, browserWagmiConfig } from '@/lib/wagmi'
import { TownsProvider, useTowns } from '@/context/TownsContext'
import { useState, useEffect, useMemo } from 'react'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TownsProvider>
        <WagmiLayer>{children}</WagmiLayer>
      </TownsProvider>
    </QueryClientProvider>
  )
}

function WagmiLayer({ children }: { children: React.ReactNode }) {
  const { isTowns, contextReady } = useTowns()

  // Use state to track config and ensure stability during SSR/Prerendering
  const [config, setConfig] = useState(browserWagmiConfig)

  useEffect(() => {
    if (contextReady && isTowns) {
      setConfig(townsWagmiConfig)
    }
  }, [contextReady, isTowns])

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
          <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-zinc-500 font-black uppercase tracking-[0.3em] animate-pulse text-sm">Initializing Towns</p>
            </div>
          </div>
        )}
      </RainbowKitProvider>
    </WagmiProvider>
  )
}