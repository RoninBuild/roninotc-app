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

  // Mouse tracking for grid/character effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center bg-background bg-grid relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >

      {/* Interactive Spotlight & Character Reveal */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(29, 78, 216, 0.08), transparent 60%)`
        }}
      />

      {/* The Ronin Character (Peeking from darkness) */}
      <div
        className="absolute bottom-[-50px] right-[-100px] md:right-[5%] md:bottom-[-20px] w-[500px] h-[500px] opacity-10 pointer-events-none transition-all duration-700 ease-out"
        style={{
          transform: `translate(${mousePos.x * 0.02}px, ${mousePos.y * 0.02}px)`,
          filter: `brightness(${1 + (mousePos.x / 1000)}) drop-shadow(0 0 30px rgba(105, 90, 246, 0.2))`
        }}
      >
        <img src="/assets/ronin.png" alt="Ronin Character" className="w-full h-full object-contain mix-blend-screen opacity-60" />
        {/* Glowing Eyes Effect */}
        <div className="absolute top-[38%] left-[42%] w-3 h-1 bg-purple-400 blur-[2px] animate-pulse shadow-[0_0_15px_#A855F7]" />
        <div className="absolute top-[38%] left-[55%] w-3 h-1 bg-purple-400 blur-[2px] animate-pulse shadow-[0_0_15px_#A855F7]" />
      </div>

      {/* Hero Section - Moved Higher */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-start justify-center min-h-[75vh] px-8 md:px-12 -mt-20">

        {/* Badge - Separate Pills */}
        <div className="mb-12 opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
          <div className="inline-flex items-center gap-3">
            <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
              <span className="font-bold text-sm tracking-widest text-[#A855F7] uppercase shadow-purple-500/20 drop-shadow-lg">
                RONIN
              </span>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
              <span className="font-bold text-sm tracking-widest text-white uppercase opacity-80">
                OTC
              </span>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="font-sans text-8xl md:text-[10rem] font-black tracking-tighter text-white leading-[0.85] mb-12 opacity-0 animate-[slideUp_0.8s_ease-out_0.2s_forwards]">
          Secure. <br />
          Trustless. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2E8F0] to-[#A855F7]">
            Towns.
          </span>
        </h1>

        <p className="text-2xl md:text-3xl text-secondary max-w-2xl font-semibold mb-16 leading-relaxed opacity-0 animate-[slideUp_0.8s_ease-out_0.4s_forwards] tracking-tight">
          The first specialized OTC protocol on Base. <br />
          Built for the <span className="text-white">Towns</span> ecosystem.
        </p>

        {/* Input Box */}
        <div className="w-full max-w-xl relative group opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#A855F7] to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />

          <div className="relative flex items-center bg-[#050505] border border-white/10 rounded-2xl p-2.5 shadow-2xl">
            <div className="pl-6 pr-4 text-[#A855F7] font-mono text-xl select-none pointer-events-none font-black">
              {`>`}
            </div>
            <input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              placeholder="Enter Deal ID..."
              className="flex-1 bg-transparent border-none text-white px-2 py-4 focus:outline-none placeholder:text-gray-500 font-sans font-bold text-xl tracking-wide"
              onKeyPress={(e) => e.key === 'Enter' && handleOpenDeal()}
              autoFocus
            />
            <button
              onClick={handleOpenDeal}
              disabled={!dealId.trim()}
              className="bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-black font-sans py-4 px-10 rounded-xl transition-all text-sm uppercase tracking-widest shadow-lg"
            >
              Enter
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
