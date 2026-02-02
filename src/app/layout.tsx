import type { Metadata } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
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
      <body className={`antialiased bg-background text-white font-sans ${inter.variable} ${spaceMono.variable}`}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <header className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
              <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">

                {/* Navigation Tabs (Towns Style) */}
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/5">
                  <div className="px-5 py-2 rounded-full bg-white text-black font-bold text-sm tracking-wide shadow-lg">
                    OTC
                  </div>
                  <div className="relative px-5 py-2 rounded-full text-secondary font-medium text-sm hover:text-white transition-colors cursor-not-allowed group">
                    PreMarket
                    <span className="absolute -top-2 -right-2 bg-[#695AF6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      SOON
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <a href="https://x.com/maronin_crypto" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-white transition-colors">
                    {/* Exact X (Twitter) Icon */}
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zl-1.161 8.757h7.72l-1.397-1.454-5.596-5.832L17.582 2.25H16.32L4.195 19.467h2.08l10.808-15.763z"></path></svg>
                  </a>
                  {/* Show Balance enabled */}
                  <ConnectButton showBalance={true} chainStatus="icon" accountStatus="full" />
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
