import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

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
      <body className={` antialiased bg-[#0a0a0f]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
