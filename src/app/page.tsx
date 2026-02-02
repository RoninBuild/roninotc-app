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
    <div className="min-h-screen flex flex-col justify-center bg-background bg-grid relative overflow-hidden">

      {/* Background Ambience - Blue glow from top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      {/* Hero Section */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-start justify-center min-h-[80vh] px-4 md:px-0">

        {/* Badge */}
        <div className="mb-6">
          <span className="font-mono text-xs md:text-sm text-secondary tracking-wider">
            () <span className="text-white font-bold ml-1">RoninOTC</span>
          </span>
        </div>

        {/* Main Title - Left Aligned, Huge */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white leading-[1] mb-8">
          Secure. <br />
          Trustless. <br />
          OTC.
        </h1>

        <p className="text-lg text-secondary max-w-xl font-light mb-12 leading-relaxed">
          A protocol for peer-to-peer deals on Base. <br />
          No middleman. No headaches. Just safe swaps.
        </p>

        {/* Code Input Box */}
        <div className="w-full max-w-lg relative group">
          {/* Glowing border effect */}
          <div className="absolute -inset-0.5 bg-white/20 rounded-lg blur opacity-30 duration-500 animate-pulse" />

          <div className="relative flex items-center bg-[#000000] border border-white/20 rounded-lg p-1">
            <div className="pl-4 pr-2 text-secondary font-mono select-none pointer-events-none">
              {`>`}
            </div>
            <input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              placeholder="Type deal id..."
              className="flex-1 bg-transparent border-none text-white px-2 py-4 focus:outline-none placeholder:text-gray-700 font-mono text-base md:text-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleOpenDeal()}
              autoFocus
            />
            <button
              onClick={handleOpenDeal}
              disabled={!dealId.trim()}
              className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold font-mono py-2 px-6 rounded-md transition-all text-sm uppercase tracking-wide"
            >
              Enter
            </button>
          </div>
        </div>

        {/* Footer hidden/minimal as requested */}
      </div>
    </div>
  )
}
