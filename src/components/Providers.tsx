'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { townsWagmiConfig, browserWagmiConfig } from '@/lib/wagmi'
import { TownsProvider } from '@/context/TownsContext'
import { detectTownsEnvironment } from '@/lib/detectTowns'
import { useMemo } from 'react'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  // Detect Towns environment early (before SDK init)
  const isTownsEnv = useMemo(() => detectTownsEnvironment(), [])

  // Select appropriate Wagmi config
  const config = isTownsEnv ? townsWagmiConfig : browserWagmiConfig

  console.log('Providers: Using config for', isTownsEnv ? 'TOWNS' : 'BROWSER')

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7b3ff2',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          <TownsProvider>
            {children}
          </TownsProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}