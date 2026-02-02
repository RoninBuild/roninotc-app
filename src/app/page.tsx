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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />
      
      <header className="relative border-b border-white/5 bg-black/30 backdrop-blur-xl z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold shadow-lg">
              R
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              RoninOTC
            </h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6 animate-float">
            <div className="inline-block">
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-500/20 text-sm font-medium text-indigo-300 mb-6">
                Trustless Escrow Protocol
              </div>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                Secure OTC Trading
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent glow-text">
                on Base
              </span>
            </h2>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Peer-to-peer crypto deals with smart contract escrow. No middleman, no trust required.
            </p>
          </div>

          {/* Input Section */}
          <div className="gradient-border rounded-2xl p-8 space-y-6 max-w-2xl mx-auto">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Enter Deal ID or Escrow Address
              </label>
              <input
                type="text"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                placeholder="DEAL-1234567890-abc123"
                className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 text-white placeholder-gray-500 transition-all focus:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                onKeyPress={(e) => e.key === 'Enter' && handleOpenDeal()}
              />
            </div>
            
            <button
              onClick={handleOpenDeal}
              disabled={!dealId.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:from-indigo-600 hover:via-purple-600 hover:to-cyan-600 disabled:from-gray-700 disabled:via-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] disabled:shadow-none disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Open Deal
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="neon-box neon-box-hover rounded-2xl p-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-3xl border border-indigo-500/30">
                🔒
              </div>
              <h3 className="font-bold text-lg text-white">Secure</h3>
              <p className="text-sm text-gray-400">Smart contract escrow on Base network</p>
            </div>
            
            <div className="neon-box neon-box-hover rounded-2xl p-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center text-3xl border border-purple-500/30">
                ⚡
              </div>
              <h3 className="font-bold text-lg text-white">Fast</h3>
              <p className="text-sm text-gray-400">Instant settlement with USDC</p>
            </div>
            
            <div className="neon-box neon-box-hover rounded-2xl p-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center text-3xl border border-cyan-500/30">
                🤝
              </div>
              <h3 className="font-bold text-lg text-white">Trustless</h3>
              <p className="text-sm text-gray-400">No intermediaries needed</p>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap gap-3 justify-center mt-12">
            <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-bold shadow-lg">
              OTC Escrow Live
            </div>
            <div className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400">
              Premarket Coming Soon
            </div>
          </div>
        </div>
      </main>

      <footer className="relative border-t border-white/5 py-8 text-center text-sm text-gray-500 z-10">
        <p className="flex items-center justify-center gap-2">
          Built on 
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-medium">
            Base
          </span>
          • Powered by 
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 text-purple-400 font-medium">
            Towns
          </span>
        </p>
      </footer>
    </div>
  )
}
