'use client'

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import { useTowns } from '../context/TownsContext'

export function ConnectWallet() {
    const { isTowns, townsAddress, userDisplayName, isLoading } = useTowns()

    // If loading SDK, show nothing or skeleton
    if (isLoading) return null

    // Inside Towns: Show "Connected as [User]"
    if (isTowns) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-[#1A1A1A] rounded-xl border border-white/10">
                <div className="flex flex-col items-end">
                    {userDisplayName && (
                        <span className="text-sm font-bold text-white leading-none">
                            {userDisplayName}
                        </span>
                    )}
                    {townsAddress && (
                        <span className="text-[10px] text-gray-400 font-mono mt-1">
                            {townsAddress.slice(0, 6)}...{townsAddress.slice(-4)}
                        </span>
                    )}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 border border-white/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">T</span>
                </div>
            </div>
        )
    }

    // Outside Towns: Standard RainbowKit
    return <RainbowConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
}
