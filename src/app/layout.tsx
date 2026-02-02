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
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://roninotc-app.vercel.app/branding.png',
    'fc:frame:image:aspect_ratio': '1:1',
    'fc:frame:button:1': 'Launch RoninOTC',
    'fc:frame:button:1:action': 'launch_frame',
    'fc:frame:button:1:target': 'https://roninotc-app.vercel.app',
    'fc:frame:post_url': 'https://roninotc-app.vercel.app/api/frame',

    'fc:frame:v2': JSON.stringify({
      version: 'next',
      imageUrl: 'https://roninotc-app.vercel.app/branding.png',
      button: {
        title: 'Launch RoninOTC',
        action: {
          type: 'launch_app',
          name: 'RoninOTC',
          url: 'https://roninotc-app.vercel.app',
          splashImageUrl: 'https://roninotc-app.vercel.app/branding.png',
          splashBackgroundColor: '#000000',
        },
      },
    }),

    'towns:miniapp': JSON.stringify({
      name: 'RoninOTC',
      description: 'Trustless Escrow OTC on Base',
      version: '1.0',
      imageUrl: 'https://roninotc-app.vercel.app/branding.png',
      button: {
        title: 'Make a deal',
        action: {
          type: 'launch_miniapp',
          name: 'RoninOTC',
          url: 'https://roninotc-app.vercel.app',
        },
      },
    }),

    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://roninotc-app.vercel.app/branding.png',
      button: {
        title: 'Make a deal',
        action: {
          type: 'launch_miniapp',
          name: 'RoninOTC',
          url: 'https://roninotc-app.vercel.app',
        },
      },
    }),

    'og:title': 'RoninOTC - Trustless Escrow on Base',
    'og:description': 'Secure OTC deals in Towns channels. Built for the Towns ecosystem.',
    'og:image': 'https://roninotc-app.vercel.app/branding.png',
    'og:url': 'https://roninotc-app.vercel.app',
    'twitter:card': 'summary_large_image',
    'twitter:title': 'RoninOTC - Trustless Escrow on Base',
    'twitter:description': 'Secure OTC deals in Towns channels. Built for the Towns ecosystem.',
    'twitter:image': 'https://roninotc-app.vercel.app/branding.png',
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
