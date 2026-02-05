'use client'

import { useAccount } from 'wagmi'
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import { useTowns } from '../context/TownsContext'

export function ConnectWallet() {
    const { isTowns, userDisplayName, pfpUrl, isLoading, townsAddress } = useTowns()
    const { address: wagmiAddress } = useAccount()

    if (isLoading) return null

    if (isTowns) {
        return (
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 bg-white/5 border-4 border-white/20 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all hover:border-white/40 group">
                    <div className="relative">
                        {pfpUrl ? (
                            <img src={pfpUrl} className="w-12 h-12 rounded-full border-2 border-white/40 shadow-lg object-cover" alt="Profile" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-white/40 flex items-center justify-center font-black text-zinc-500 shadow-md">T</div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-[#050505] rounded-full animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-brand-gradient transition-colors">
                            {userDisplayName || 'Towns User'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 bg-zinc-700 rounded-full" />
                            Towns Native Account
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return <RainbowConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
}
