'use client'

import { useAccount } from 'wagmi'
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import { useTowns } from '../context/TownsContext'

export function ConnectWallet() {
    const { isTowns, townsAddress, identityAddress, userDisplayName, pfpUrl, isLoading, rawContext } = useTowns()
    const { address: wagmiAddress, connector } = useAccount()

    // If loading SDK, show nothing or skeleton
    if (isLoading) return null

    // Inside Towns: Show Towns Branded UI
    if (isTowns) {
        const displayAddr = townsAddress
            ? `${townsAddress.slice(0, 6)}...${townsAddress.slice(-4)}`
            : 'Connect'

        return (
            <div className="flex flex-col items-end gap-2">
                {/* Main Towns UI */}
                <div className="flex items-center gap-3 bg-zinc-800/80 px-4 py-2 rounded-full border border-zinc-700/50 backdrop-blur-md shadow-sm">
                    {pfpUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={pfpUrl}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full object-cover border border-zinc-600"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">T</span>
                        </div>
                    )}

                    <div className="flex flex-col text-right leading-tight">
                        <span className="text-xs text-zinc-400 font-medium">
                            {userDisplayName || 'Towns User'}
                        </span>
                        <span className="text-sm font-bold text-white tracking-wide">
                            {displayAddr}
                        </span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                </div>

                {/* Debug Overlay - Comprehensive */}
                <div className="flex flex-col items-start text-[9px] text-zinc-300 bg-black/95 p-3 rounded border border-zinc-700 font-mono space-y-1 max-w-md">
                    <div className="text-zinc-400 uppercase font-bold text-[10px] mb-2 border-b border-zinc-700 w-full pb-1">🔍 SDK Context Debug</div>

                    {/* Client Info */}
                    <div className="w-full">
                        <span className="text-zinc-500">Client:</span>{' '}
                        <span className="text-cyan-400">{rawContext?.client?.clientName || 'unknown'}</span>
                    </div>

                    {/* Towns Detection */}
                    <div className="w-full">
                        <span className="text-zinc-500">isTowns:</span>{' '}
                        <span className={isTowns ? 'text-green-500' : 'text-red-500'}>
                            {isTowns ? '✓ true' : '✗ false'}
                        </span>
                    </div>

                    {/* User Profile */}
                    <div className="w-full border-t border-zinc-800 pt-1 mt-1">
                        <div className="text-zinc-500 mb-0.5">User Profile:</div>
                        <div className="pl-2 space-y-0.5">
                            <div>
                                <span className="text-zinc-600">Display:</span>{' '}
                                <span className="text-purple-400">{userDisplayName || 'null'}</span>
                            </div>
                            <div>
                                <span className="text-zinc-600">PFP:</span>{' '}
                                <span className="text-purple-400">{pfpUrl ? '✓' : '✗'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Addresses */}
                    <div className="w-full border-t border-zinc-800 pt-1 mt-1">
                        <div className="text-zinc-500 mb-0.5">Addresses:</div>
                        <div className="pl-2 space-y-0.5">
                            <div>
                                <span className="text-zinc-600">Smart Wallet:</span>{' '}
                                <span className={townsAddress ? 'text-green-400' : 'text-red-400'}>
                                    {townsAddress?.slice(0, 10)}...{townsAddress?.slice(-6) || 'null'}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-600">Identity:</span>{' '}
                                <span className="text-yellow-400">
                                    {identityAddress?.slice(0, 10)}...{identityAddress?.slice(-6) || 'null'}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-600">Wagmi:</span>{' '}
                                <span className="text-blue-400">
                                    {wagmiAddress?.slice(0, 10)}...{wagmiAddress?.slice(-6) || 'none'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Connection Status */}
                    <div className="w-full border-t border-zinc-800 pt-1 mt-1">
                        <div className="text-zinc-500 mb-0.5">Connection:</div>
                        <div className="pl-2 space-y-0.5">
                            <div>
                                <span className="text-zinc-600">Connector:</span>{' '}
                                <span className={connector?.id === 'towns' ? 'text-green-500' : 'text-orange-500'}>
                                    {connector?.id || 'none'}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-600">Match:</span>{' '}
                                <span className={townsAddress?.toLowerCase() === wagmiAddress?.toLowerCase() ? 'text-green-500' : 'text-red-500'}>
                                    {townsAddress?.toLowerCase() === wagmiAddress?.toLowerCase() ? '✓ OK' : '✗ MISMATCH'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Raw Context (collapsed) */}
                    <details className="w-full border-t border-zinc-800 pt-1 mt-1">
                        <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300">Raw Context JSON</summary>
                        <pre className="text-[8px] text-zinc-400 mt-1 p-1 bg-zinc-900 rounded overflow-auto max-h-40">
                            {JSON.stringify(rawContext, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        )
    }

    // Outside Towns: Standard RainbowKit
    return <RainbowConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
}
