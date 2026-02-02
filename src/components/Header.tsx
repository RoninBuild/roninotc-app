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
        <header className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/5 shadow-inner">
                    <div className="px-5 py-2 rounded-full bg-white text-black font-bold text-sm tracking-wide shadow-lg transform transition active:scale-95 cursor-default">
                        OTC
                    </div>
                    <div className="relative px-5 py-2 rounded-full text-secondary font-medium text-sm hover:text-white transition-colors cursor-not-allowed group">
                        PreMarket
                        <span className="absolute -top-2 -right-2 bg-[#695AF6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity transition-transform group-hover:-translate-y-1">
                            SOON
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Socials */}
                    <a href="https://x.com/maronin_crypto" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        {/* Fixed X Icon (Clean Path) */}
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zl-1.161 8.757h7.72l-1.397-1.454-5.596-5.832L17.582 2.25H16.32L4.195 19.467h2.08l10.808-15.763z" />
                        </svg>
                    </a>

                    {/* Wallet Area */}
                    <div className="flex items-center gap-3">
                        {mounted && isConnected && balanceData && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-sm font-mono text-white/90">
                                <span className="text-blue-400">$</span>
                                {Number(balanceData.formatted).toFixed(2)}
                                <span className="text-secondary text-xs">USDC</span>
                            </div>
                        )}
                        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
                    </div>
                </div>
            </div>
        </header>
    )
}
