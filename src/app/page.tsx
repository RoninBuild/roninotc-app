'use client'

import { useState } from 'react'
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">

      {/* Background Ambience - Blue glow from top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-4xl w-full text-center space-y-8">

        {/* Small Pill Label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-medium text-blue-200">RoninOTC Protocol</span>
        </div>

        {/* Main Title */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white leading-[1.1]">
          Secure OTC <br />
          <span className="relative inline-block text-white">
            Trading
            {/* Scribble Underline SVG */}
            <svg className="absolute -bottom-2 w-full h-3 text-blue-600" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>
          </span>
        </h1>

        <p className="text-lg md:text-xl text-secondary max-w-2xl mx-auto font-light">
          Trustless peer-to-peer deals on Base. <br className="hidden md:block" />
          No middleman. No headaches. Just safe swaps.
        </p>

        {/* Search Input Box (Replacing the old button) */}
        <div className="max-w-md mx-auto mt-12 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl opacity-30 group-hover:opacity-60 blur transition duration-500" />
          <div className="relative flex items-center bg-[#0A0A0A] rounded-xl p-2 shadow-2xl border border-white/10">
            <div className="pl-4 text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
            <input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              placeholder="Search Deal ID..."
              className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:outline-none placeholder:text-gray-600 text-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleOpenDeal()}
            />
            <button
              onClick={handleOpenDeal}
              disabled={!dealId.trim()}
              className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 px-6 rounded-lg transition-all"
            >
              Search
            </button>
          </div>
        </div>

        {/* Footer/Features minimal */}
        <div className="pt-20 flex justify-center gap-12 text-sm text-secondary font-medium uppercase tracking-wider opacity-60">
          <div className="flex items-center gap-2">
            <span>🔒</span> Smart Contracts
          </div>
          <div className="flex items-center gap-2">
            <span>⚡</span> Instant Setlement
          </div>
        </div>

      </div>
    </div>
  )
}
