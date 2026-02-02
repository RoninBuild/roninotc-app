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
    <div className="min-h-screen flex flex-col justify-center bg-background bg-grid relative overflow-hidden animate-wave bg-[linear-gradient(to_right,#050505,#0a0a0a,#050505)]">

      {/* Background Ambience - Living Wave */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none opacity-40 animate-pulse duration-[5000ms]" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-[#A855F7]/10 blur-[150px] rounded-full pointer-events-none opacity-30 animate-pulse duration-[7000ms]" />

      {/* Hero Section */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-start justify-center min-h-[85vh] px-6 md:px-0">

        {/* Badge - Shimmering Text */}
        <div className="mb-10 opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-[#A855F7]/50 transition-colors">
            <div className="w-2 h-2 rounded-full bg-[#A855F7] animate-pulse shadow-[0_0_10px_#A855F7]" />
            <span className="font-sans font-bold text-sm tracking-widest text-transparent bg-clip-text bg-[linear-gradient(110deg,#9333ea,45%,#ffffff,55%,#9333ea)] bg-[length:250%_100%] animate-shimmer uppercase">
              RoninOTC
            </span>
          </div>
        </div>

        {/* Main Title - Heavy Sans Serif, Towns Style */}
        <h1 className="font-sans text-7xl md:text-9xl font-black tracking-tighter text-white leading-[0.9] mb-12 opacity-0 animate-[slideUp_0.8s_ease-out_0.2s_forwards]">
          Secure. <br />
          Trustless. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#A855F7]">
            Towns.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-secondary max-w-2xl font-medium mb-16 leading-relaxed opacity-0 animate-[slideUp_0.8s_ease-out_0.4s_forwards]">
          The first specialized OTC protocol on Base. <br />
          Built for the Towns ecosystem.
        </p>

        {/* Code Input Box - Refined */}
        <div className="w-full max-w-lg relative group opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#A855F7] to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />

          <div className="relative flex items-center bg-[#080808] border border-white/10 rounded-xl p-2 shadow-2xl">
            <div className="pl-5 pr-3 text-[#A855F7] font-mono text-lg select-none pointer-events-none font-bold">
              {`>`}
            </div>
            <input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              placeholder="Enter Deal ID..."
              className="flex-1 bg-transparent border-none text-white px-2 py-4 focus:outline-none placeholder:text-gray-600 font-sans font-bold text-lg tracking-wide"
              onKeyPress={(e) => e.key === 'Enter' && handleOpenDeal()}
              autoFocus
            />
            <button
              onClick={handleOpenDeal}
              disabled={!dealId.trim()}
              className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold font-sans py-3 px-8 rounded-lg transition-all text-sm uppercase tracking-wider"
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
