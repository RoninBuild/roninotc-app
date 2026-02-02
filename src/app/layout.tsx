import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'RoninOTC - Trustless Escrow on Base',
  description: 'OTC escrow deals on Base with USDC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased bg-background text-white`}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
              <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                <div className="flex items-center gap-8">
                  <span className="text-xl font-bold tracking-tight">OTC</span>
                  <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <span className="text-secondary cursor-not-allowed">PreMarket (soon)</span>
                    <a href="https://x.com/maronin_crypto" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-white transition-colors">
                      My X
                    </a>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  <ConnectButton />
                </div>
              </div>
            </header>
            <main className="flex-grow pt-20">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
