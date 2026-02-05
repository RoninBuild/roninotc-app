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
                <div className="flex items-center gap-3 bg-white/5 border-[3px] border-white/10 px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.03)] transition-all hover:border-white/30 group">
                    <div className="relative">
                        {pfpUrl ? (
                            <img src={pfpUrl} className="w-10 h-10 rounded-full border-2 border-white/20 shadow-lg object-cover" alt="Profile" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/20 flex items-center justify-center font-black text-zinc-500 shadow-md">T</div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-[3px] border-[#050505] rounded-full animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-white uppercase tracking-tighter leading-none group-hover:text-brand-gradient transition-colors">
                            {userDisplayName || 'Towns User'}
                        </span>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5 transition-colors group-hover:text-zinc-400">
                            <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                            Towns Account
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return <RainbowConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
}
