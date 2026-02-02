'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance } from 'wagmi'
import { useEffect, useState } from 'react'

export function Header() {
    const { address, isConnected } = useAccount()
    // Base USDC Address
    const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

    const { data: balanceData } = useBalance({
        address: address,
        token: usdcAddress,
        chainId: 8453, // Base
    })

    // Prevent hydration mismatch
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    return (
        <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 h-24 flex justify-between items-center">

                {/* Navigation Tabs (Shimmering Border) */}
                <div className="relative p-[1px] rounded-full overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_3s_infinite]" />
                    <div className="relative flex items-center gap-2 bg-[#0A0A0A] p-1.5 rounded-full border border-white/10">
                        <div className="px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-sm tracking-wide shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            OTC
                        </div>
                        <div className="relative px-6 py-2.5 rounded-full text-secondary font-semibold text-sm hover:text-white transition-colors cursor-not-allowed group-hover:text-gray-300">
                            PreMarket
                            <span className="absolute -top-3 -right-2 bg-[#695AF6] text-white text-[10px] font-black px-2 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1 shadow-[0_0_10px_#695AF6]">
                                SOON
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Socials */}
                    <a href="https://x.com/maronin_crypto" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zl-1.161 8.757h7.72l-1.397-1.454-5.596-5.832L17.582 2.25H16.32L4.195 19.467h2.08l10.808-15.763z" />
                        </svg>
                    </a>

                    {/* Wallet Area */}
                    <div className="flex items-center gap-4">
                        {mounted && isConnected && balanceData && (
                            <div className="hidden md:flex flex-col items-end leading-none">
                                <span className="text-[10px] text-secondary font-bold tracking-wider uppercase mb-0.5">Balance</span>
                                <div className="flex items-center gap-1.5 text-white font-bold text-lg tracking-tight">
                                    {Number(balanceData.formatted).toFixed(2)}
                                    <span className="text-[#2775CA] font-black">USDC</span>
                                </div>
                            </div>
                        )}
                        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                    </div>
                </div>
            </div>
        </header>
    )
}
