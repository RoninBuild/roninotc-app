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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">RoninOTC</h1>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block px-3 py-1 mb-6 text-sm border border-gray-800 rounded-full">
            Trustless Escrow Protocol
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Secure OTC Trading<br />on Base
          </h2>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Peer-to-peer crypto deals with smart contract escrow. No middleman, no trust required.
          </p>
        </div>

        {/* Input Box */}
        <div className="max-w-2xl mx-auto mb-20">
          <div className="border border-gray-800 rounded-lg p-6 bg-black">
            <label className="block text-sm text-gray-400 mb-3">
              Enter Deal ID or Escrow Address
            </label>
            <input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              placeholder="DEAL-1234567890-abc123"
              className="w-full px-4 py-3 mb-4 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
              onKeyPress={(e) => e.key === 'Enter' && handleOpenDeal()}
            />
            <button
              onClick={handleOpenDeal}
              disabled={!dealId.trim()}
              className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Open Deal
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="border border-gray-800 rounded-lg p-8 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold mb-2">Secure</h3>
            <p className="text-sm text-gray-400">Smart contract escrow on Base network</p>
          </div>
          
          <div className="border border-gray-800 rounded-lg p-8 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">Fast</h3>
            <p className="text-sm text-gray-400">Instant settlement with USDC</p>
          </div>
          
          <div className="border border-gray-800 rounded-lg p-8 text-center">
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="font-semibold mb-2">Trustless</h3>
            <p className="text-sm text-gray-400">No intermediaries needed</p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-3 justify-center">
          <div className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full">
            OTC Escrow Live
          </div>
          <div className="px-4 py-2 border border-gray-800 text-sm text-gray-400 rounded-full">
            Premarket Coming Soon
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
        <p>Built on <span className="text-gray-400">Base</span> • Powered by <span className="text-gray-400">Towns</span></p>
      </footer>
    </div>
  )
}
