import type { Metadata } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Header } from '@/components/Header'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'RoninOTC - Trustless Escrow on Base',
  description: 'OTC escrow deals on Base with USDC',
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: 'https://roninotc-app.vercel.app/logo.png',
      button: {
        title: 'Launch RoninOTC',
        action: {
          type: 'launch_app',
          name: 'RoninOTC',
          url: 'https://roninotc-app.vercel.app',
        },
      },
    }),
    'towns:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://roninotc-app.vercel.app/logo.png',
      button: {
        title: 'Launch RoninOTC',
        action: {
          type: 'launch_app',
          name: 'RoninOTC',
          url: 'https://roninotc-app.vercel.app',
        },
      },
    }),
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://roninotc-app.vercel.app/logo.png',
      button: {
        title: 'Launch RoninOTC',
        action: {
          type: 'launch_app',
          name: 'RoninOTC',
          url: 'https://roninotc-app.vercel.app',
        },
      },
    }),
    'fc:frame:image': 'https://roninotc-app.vercel.app/logo.png',
    'fc:frame:button:1': 'Launch RoninOTC',
    'fc:frame:button:1:action': 'launch_frame',
    'fc:frame:button:1:target': 'https://roninotc-app.vercel.app',
  },
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
            <Header />
            <main className="flex-grow pt-20">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
