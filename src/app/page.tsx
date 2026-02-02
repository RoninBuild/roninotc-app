'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function HomeContent() {
  const [dealId, setDealId] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qDealId = searchParams.get('dealId')
    if (qDealId) {
      router.push(`/deal/${qDealId}`)
    }
  }, [searchParams, router])

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
        className="absolute bottom-[0px] right-[-50px] md:right-[5%] md:bottom-[15%] w-[600px] h-[600px] opacity-25 pointer-events-none transition-all duration-700 ease-out z-0"
        style={{
          transform: `translate(${mousePos.x * 0.015}px, ${mousePos.y * 0.015}px)`,
          // Using a mask to hide the hard edges of the image background
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 70%)',
        }}
      >
        <img src="/assets/ronin.png" alt="Ronin Character" className="w-full h-full object-contain mix-blend-multiply filter contrast-125 saturate-0" />
        {/* Glowing Eyes - Repositioned for larger scale */}
        <div className="absolute top-[38%] left-[42%] w-3 h-3 bg-purple-500 blur-[4px] animate-pulse shadow-[0_0_25px_#A855F7]" />
        <div className="absolute top-[38%] left-[55%] w-3 h-3 bg-purple-500 blur-[4px] animate-pulse shadow-[0_0_25px_#A855F7]" />
      </div>

      {/* Hero Section - Moved Higher */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-start justify-center min-h-[75vh] px-8 md:px-12 -mt-24">

        {/* Simple Text Header (Replaces Badge) */}
        <div className="mb-6 opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
          <span className="font-sans font-black text-4xl md:text-5xl tracking-tighter uppercase drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2E8F0] to-[#A855F7]">
            RONIN OTC
          </span>
        </div>

        {/* Main Title - Scaled Down (~20%) */}
        <h1 className="font-sans text-6xl md:text-[7rem] font-black tracking-tighter text-white leading-[0.85] mb-10 opacity-0 animate-[slideUp_0.8s_ease-out_0.2s_forwards]">
          Secure. <br />
          Trustless. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2E8F0] to-[#A855F7]">
            Towns.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-secondary max-w-2xl font-medium mb-12 leading-relaxed opacity-0 animate-[slideUp_0.8s_ease-out_0.4s_forwards] tracking-tight">
          The first specialized <span className="text-white font-bold">OTC</span> protocol on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 font-bold">Base</span>. <br />
          Built for the <span className="text-white">Towns</span> ecosystem.
        </p>

        {/* Input Box - Thicker Border */}
        <div className="w-full max-w-xl relative group opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#A855F7] to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />

          <div className="relative flex items-center bg-[#050505] border-2 border-white/20 rounded-2xl p-2.5 shadow-2xl">
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

      {/* CSS-based Random Cell Highlight Effect (Simulated Grid) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white/5 animate-pulse"
            style={{
              width: '50px',
              height: '50px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 5}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.3
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
