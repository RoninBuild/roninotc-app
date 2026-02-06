'use client'

import { ConnectWallet } from './ConnectWallet'
import { useAccount, useBalance } from 'wagmi'
import { useEffect, useState } from 'react'
import { useTowns } from '../context/TownsContext'
import { USDC_ADDRESS } from '@/lib/contracts'

export function Header() {
    const { townsAddress, isTowns } = useTowns()
    const { address: wagmiAddress, isConnected } = useAccount()

    // Priority for Towns users: use their real smart wallet address for balance display
    const effectiveAddress = isTowns && townsAddress ? (townsAddress as `0x${string}`) : wagmiAddress

    useEffect(() => {
        if (effectiveAddress) {
            console.log('Header balance check address:', effectiveAddress, 'isTowns:', isTowns, 'townsAddress:', townsAddress, 'wagmiAddress:', wagmiAddress)
        }
    }, [effectiveAddress, isTowns, townsAddress, wagmiAddress])

    const { data: balanceData } = useBalance({
        address: effectiveAddress,
        token: USDC_ADDRESS,
        chainId: 8453, // Base
    })

    // Prevent hydration mismatch
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    return (
        <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b-2 border-white/5 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 h-24 flex justify-between items-center">

                {/* Navigation Tabs (Thicker Border) */}
                <div className="relative p-[2px] rounded-full overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_3s_infinite]" />
                    <div className="relative flex items-center gap-2 bg-[#0A0A0A] p-1.5 rounded-full border-2 border-white/10">
                        <div className="px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-sm tracking-wide shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            OTC
                        </div>
                        <div className="relative flex items-center gap-2 px-6 py-2.5 rounded-full text-secondary font-bold text-sm hover:text-white transition-colors cursor-not-allowed group-hover:text-gray-300">
                            PreMarket
                            <span className="bg-[#695AF6] text-white text-[10px] font-black px-2 py-0.5 rounded-sm shadow-[0_0_10px_#695AF6] tracking-wide">
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
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#050505] rounded-xl border-2 border-blue-500/30 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/10 blur-md group-hover:bg-blue-500/20 transition-all" />
                                <span className="relative text-[10px] text-blue-200 font-bold tracking-wider uppercase mr-2">Base</span>
                                <div className="relative flex items-center gap-1.5 text-white font-bold text-lg tracking-tight">
                                    {Number(balanceData.formatted).toFixed(2)}
                                    <span className="text-blue-400 font-black">USDC</span>
                                </div>
                            </div>
                        )}
                        <ConnectWallet />
                    </div>
                </div>
            </div>
        </header>
    )
}
