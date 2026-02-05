import { useAccount } from 'wagmi'
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import { useTowns } from '../context/TownsContext'

export function ConnectWallet() {
    const { isTowns, townsAddress, userDisplayName, pfpUrl, isLoading } = useTowns()
    const { address: wagmiAddress, connector } = useAccount()

    // If loading SDK, show nothing or skeleton
    if (isLoading) return null

    // Inside Towns: Show "Connected as [User]"
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

                {/* Debug Overlay - Temporary */}
                <div className="flex flex-col items-end text-[10px] text-zinc-500 bg-black/80 p-2 rounded border border-zinc-800 font-mono">
                    <div>Towns: <span className={(townsAddress?.toLowerCase() === wagmiAddress?.toLowerCase()) ? 'text-green-500' : 'text-red-500'}>{townsAddress?.slice(0, 6)}...</span></div>
                    <div>Wagmi: <span className="text-blue-400">{wagmiAddress?.slice(0, 6)}...</span></div>
                    <div>Conn: <span className="text-yellow-500">{connector?.id || 'none'}</span></div>
                </div>
            </div>
        )
    }

    // Outside Towns: Standard RainbowKit
    return <RainbowConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
}
