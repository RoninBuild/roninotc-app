'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [dealId, setDealId] = useState('')
  const router = useRouter()

  const handleOpenDeal = () => {
    if (dealId.trim()) {
      router.push(`/deal/${dealId.trim()}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neon-purple/20 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-3xl"></div>
            <h1 className="text-2xl font-bold glow-text">RoninOTC</h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="animate-float mb-8">
            <div className="text-8xl mb-4"></div>
            <h2 className="text-5xl font-bold mb-4 glow-text">
              Trustless OTC Escrow
            </h2>
            <p className="text-xl text-gray-400">
              Secure peer-to-peer deals on Base with USDC
            </p>
          </div>

          <div className="neon-box rounded-xl p-8 space-y-4">
            <label className="block text-left text-sm font-medium text-gray-300">
              Enter Deal ID or Escrow Address
            </label>
            <input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              placeholder="DEAL-1234567890-abc123"
              className="w-full px-4 py-3 bg-black/50 border border-neon-purple/30 rounded-lg focus:outline-none focus:border-neon-purple text-white placeholder-gray-500"
              onKeyPress={(e) => e.key === 'Enter' && handleOpenDeal()}
            />
            <button
              onClick={handleOpenDeal}
              disabled={!dealId.trim()}
              className="w-full bg-neon-purple hover:bg-neon-purple/80 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all glow-border disabled:opacity-50"
            >
              Open Deal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            <div className="neon-box rounded-lg p-6">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-bold mb-2">Secure</h3>
              <p className="text-sm text-gray-400">Smart contract escrow on Base</p>
            </div>
            <div className="neon-box rounded-lg p-6">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-bold mb-2">Fast</h3>
              <p className="text-sm text-gray-400">Instant settlement with USDC</p>
            </div>
            <div className="neon-box rounded-lg p-6">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-bold mb-2">Trustless</h3>
              <p className="text-sm text-gray-400">No middleman required</p>
            </div>
          </div>

          <div className="flex gap-2 justify-center mt-8">
            <div className="px-4 py-2 bg-neon-purple rounded-full text-sm font-bold">
              OTC Escrow
            </div>
            <div className="px-4 py-2 bg-gray-800 rounded-full text-sm text-gray-500">
              Premarket (Soon)
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-neon-purple/20 py-6 text-center text-sm text-gray-500">
        <p>Built on Base  Powered by Towns</p>
      </footer>
    </div>
  )
}