'use client'
// Final sync: 2026-02-03T21:00:00Z

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient, useSwitchChain, useBalance } from 'wagmi'
import { parseUnits, keccak256, toHex, zeroAddress } from 'viem'
import { getDeal, updateDealStatus } from '@/lib/api'
import { FACTORY_ADDRESS, USDC_ADDRESS, ARBITRATOR_ADDRESS, factoryAbi, escrowAbi, erc20Abi, parseUsdcAmount } from '@/lib/contracts'
import { useTowns } from '@/context/TownsContext'
import { useTownsTransaction } from '@/hooks/useTownsTransaction'
import type { Deal } from '@/lib/types'
import Link from 'next/link'
import MemberAvatar from '@/components/MemberAvatar'
import { motion, AnimatePresence } from 'framer-motion'

function StatusStepper({ status }: { status: string }) {
    const steps = [
        { id: '01', label: 'SETUP', key: 'draft' },
        { id: '02', label: 'DEPOSIT', key: 'created' },
        { id: '03', label: 'CLAIM', key: 'funded' },
    ]

    const currentIndex = steps.findIndex(s => s.key === status)
    // If released/resolved, all steps are done
    const isCompleted = status === 'released' || status === 'resolved' || status === 'refunded'

    return (
        <div className="flex items-center gap-6 font-industrial-mono text-xl tracking-tighter py-4 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
            {steps.map((step, index) => {
                const isActive = step.key === status
                const isPast = isCompleted || (currentIndex > index)

                return (
                    <div key={step.id} className="flex items-center gap-4 whitespace-nowrap">
                        <div className={`flex items-center gap-2 ${isActive ? 'text-white' : isPast ? 'text-zinc-500' : 'text-zinc-700'}`}>
                            <span className="opacity-50">{step.id}</span>
                            <span className="font-black">{step.label}</span>
                            {isActive && <span className="terminal-blink ml-1" />}
                        </div>
                        {index < steps.length - 1 && (
                            <div className="text-zinc-800 font-black">
                                {isPast ? (
                                    <span className="text-matrix-green">{'>>>'}</span>
                                ) : (
                                    <span>{'>>>'}</span>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function ConsoleLog({ messages }: { messages: string[] }) {
    return (
        <div className="fixed bottom-10 left-10 right-10 z-[100] pointer-events-none">
            <AnimatePresence>
                {messages.map((msg, i) => (
                    <motion.div
                        key={`${msg}-${i}`}
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="mb-2"
                    >
                        <div className="bg-black border-2 border-white p-4 inline-flex items-center gap-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            <div className="w-2 h-2 bg-white animate-pulse" />
                            <span className="font-industrial-mono text-white text-lg font-black uppercase tracking-widest">
                                {`> ${msg}`}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

type Props = {
    dealId: string
}

function CountdownTimer({ deadline }: { deadline: number }) {
    const [timeLeft, setTimeLeft] = useState<string>('')

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = deadline * 1000 - Date.now()
            if (difference <= 0) return 'EXPIRED'

            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
            const minutes = Math.floor((difference / 1000 / 60) % 60)
            const seconds = Math.floor((difference / 1000) % 60)

            let parts = []
            if (days > 0) parts.push(`${days}d`)
            if (hours > 0 || days > 0) parts.push(`${hours}h`)
            parts.push(`${minutes}m`)
            if (days === 0 && hours === 0) parts.push(`${seconds}s`)

            return parts.join(' ')
        }

        setTimeLeft(calculateTimeLeft())
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
        return () => clearInterval(timer)
    }, [deadline])

    return <span>{timeLeft}</span>
}

function LoadingSpinner({ size = 'h-6 w-6' }: { size?: string }) {
    return (
        <div className={`relative ${size} animate-spin`}>
            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-purple-500 border-r-purple-600 border-b-transparent border-l-transparent rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
        </div>
    )
}

function GlobalInteractiveGrid({ status }: { status: string }) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY })
        }
        window.addEventListener('mousemove', handleGlobalMouseMove)
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove)
    }, [])

    const getGlowColor = () => {
        if (status === 'disputed') return 'rgba(245, 158, 11, 0.15)'
        if (status === 'released' || status === 'resolved') return 'rgba(34, 197, 94, 0.15)'
        return 'rgba(168, 85, 247, 0.1)'
    }

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(1000px circle at ${mousePos.x}px ${mousePos.y}px, ${getGlowColor()}, transparent 70%)`
                }}
            />
            <div className="absolute inset-0 bg-grid opacity-[0.03]" />
        </div>
    )
}

// Refined Eyes / Peeking Logic (Ronin Industrial)
function CharacterPeeker({ mousePos, isHovered, status, isProcessing }: { mousePos: { x: number, y: number }, isHovered: boolean, status: string, isProcessing: boolean }) {
    const isError = status === 'disputed'
    const isSuccess = status === 'released' || status === 'resolved'

    // Matrix rain characters for eye scan
    const matrixChars = "01".split("")

    return (
        <div className="absolute left-1/2 -top-[340px] -translate-x-1/2 w-[800px] h-[400px] pointer-events-none z-[-2] overflow-visible transition-all duration-700 flex flex-col items-center justify-end">
            <style jsx>{`
                @keyframes breathe {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-10px) scale(1.01); }
                }
                .ronin-breathe {
                    animation: breathe 8s infinite ease-in-out;
                }
                @keyframes eyeScan {
                   0%, 100% { transform: translateX(-2px); }
                   50% { transform: translateX(2px); }
                }
                .matrix-eye-rain {
                    animation: matrixRain 1s linear infinite;
                }
            `}</style>

            <div className="ronin-breathe relative w-full h-full flex items-center justify-center">
                <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[220px] bg-white opacity-[0.02] blur-[100px] rounded-full z-[-1]" />

                <div className={`absolute inset-0 z-0 opacity-100 filter brightness-[2.4] contrast-[1.9] transition-all duration-500 ${isError ? 'grayscale-[0.5] sepia-[0.2]' : ''}`}>
                    <img
                        src="/assets/ronin-bg.png"
                        alt="Ronin Background"
                        className="w-full h-full object-contain"
                    />
                </div>

                <div
                    className="absolute inset-0 z-10"
                    style={{
                        transform: `translate(${mousePos.x * 0.001}px, ${mousePos.y * 0.001}px)`,
                    }}
                >
                    {/* LEFT EYE */}
                    <div className={`absolute top-[48.2%] left-[44.4%] w-[32px] h-[7px] overflow-hidden transition-all duration-500
                        ${isError ? 'bg-red-600 shadow-[0_0_20px_#dc2626]' : isSuccess ? 'bg-green-500 shadow-[0_0_20px_#22c55e]' : 'bg-[#A855F7] shadow-[0_0_15px_#A855F7]'}
                        ${isProcessing ? 'animate-[eyeScan_0.5s_infinite]' : 'animate-[blink_6s_infinite]'}
                    `}>
                        {isProcessing && (
                            <div className="flex flex-col text-[4px] font-industrial-mono text-white/50 matrix-eye-rain">
                                {matrixChars.map((c, i) => <span key={i}>{c}</span>)}
                            </div>
                        )}
                    </div>

                    {/* RIGHT EYE */}
                    <div className={`absolute top-[48.2%] left-[52.4%] w-[24px] h-[7px] overflow-hidden transition-all duration-500
                        ${isError ? 'bg-red-600 shadow-[0_0_20px_#dc2626]' : isSuccess ? 'bg-green-500 shadow-[0_0_20px_#22c55e]' : 'bg-[#A855F7] shadow-[0_0_15px_#A855F7]'}
                        ${isProcessing ? 'animate-[eyeScan_0.5s_infinite]' : 'animate-[blink_6s_infinite]'}
                    `}>
                        {isProcessing && (
                            <div className="flex flex-col text-[4px] font-industrial-mono text-white/50 matrix-eye-rain">
                                {matrixChars.reverse().map((c, i) => <span key={i}>{c}</span>)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}



function Card({ children, title, className = "", showCharacter = false, status = "draft", isProcessing = false }: { children: React.ReactNode, title?: string, className?: string, showCharacter?: boolean, status?: string, isProcessing?: boolean }) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
    }

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative bg-[#09090b] industrial-card rounded-none p-10 overflow-visible group/card transition-transform duration-300 hover:scale-[1.005] ${className} 
                ${status === 'disputed' ? 'status-dispute' : (status === 'released' || status === 'resolved') ? 'status-success' : isProcessing ? 'status-action' : 'status-waiting'}
            `}
        >
            {/* Mouse reactive grid overlay removed to favor industrial Card styles */}
            <div className="card-grid-glow opacity-30" />

            {/* Depth Container for Character - Only visible OUTSIDE the card (Peeking from top) */}
            {showCharacter && (
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-[-1]">
                    <CharacterPeeker mousePos={mousePos} isHovered={isHovered} status={status} isProcessing={isProcessing} />
                </div>
            )}

            <div className="relative z-10">
                {title && (
                    <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-10 leading-none">
                        {title}
                    </h3>
                )}
                {children}
            </div>
        </div>
    )
}

export default function DealClient({ dealId }: Props) {
    const { address } = useAccount()
    const publicClient = usePublicClient()
    const [deal, setDeal] = useState<Deal | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isStatusHovered, setIsStatusHovered] = useState(false)
    const [txStatus, setTxStatus] = useState<string | null>(null)
    const [consoleMessages, setConsoleMessages] = useState<string[]>([])

    const addConsoleMsg = (msg: string) => {
        setConsoleMessages(prev => [...prev.slice(-2), msg])
        setTimeout(() => {
            setConsoleMessages(prev => prev.filter(m => m !== msg))
        }, 3000)
    }

    // Wrap setTxStatus to also log to console
    const notify = (msg: string | null) => {
        setTxStatus(msg)
        if (msg) addConsoleMsg(msg)
    }

    // Towns Integration
    const { isTowns, channelId, identityAddress, townsAddress, townsUserId, setTownsAddress } = useTowns()
    const { requestTransaction, isRequesting: isTownsTxPending } = useTownsTransaction()

    // On-chain state
    const [isProcessing, setIsProcessing] = useState(false)
    const [activeAction, setActiveAction] = useState<string | null>(null) // TRACKS CURRENT ACTION
    const [onChainEscrow, setOnChainEscrow] = useState<`0x${string}` | null>(null)
    const [winnerAddr, setWinnerAddr] = useState<string | null>(null)

    // Priority for Towns users: use their real smart wallet address for balance display
    const effectiveAddress = isTowns && townsAddress ? (townsAddress as `0x${string}`) : address

    // Track status changes to clear activeAction for Towns
    const lastStatus = useRef(deal?.status)
    useEffect(() => {
        if (deal?.status !== lastStatus.current) {
            console.log(`Towns: Status changed from ${lastStatus.current} to ${deal?.status}. Clearing activeAction.`)
            setActiveAction(null)
            lastStatus.current = deal?.status
        }
    }, [deal?.status])

    // Contract write hooks
    const { writeContract: createEscrow, data: createHash, isPending: isCreating } = useWriteContract()
    const { writeContract: approveUsdc, data: approveHash, isPending: isApproving } = useWriteContract()
    const { writeContract: fundEscrow, data: fundHash, isPending: isFunding } = useWriteContract()
    const { writeContract: releaseEscrow, data: releaseHash, isPending: isReleasing } = useWriteContract()
    const { writeContract: refundEscrow, data: refundHash, isPending: isRefunding } = useWriteContract()
    const { writeContract: openDispute, data: disputeHash, isPending: isDisputing } = useWriteContract()
    const { writeContract: resolveDispute, data: resolveHash, isPending: isResolving } = useWriteContract()

    // Transaction confirmations
    const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess, data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash })
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
    const { isLoading: isFundConfirming, isSuccess: isFundSuccess } = useWaitForTransactionReceipt({ hash: fundHash })
    const { isLoading: isReleaseConfirming, isSuccess: isReleaseSuccess } = useWaitForTransactionReceipt({ hash: releaseHash })
    const { isLoading: isRefundConfirming, isSuccess: isRefundSuccess } = useWaitForTransactionReceipt({ hash: refundHash })
    const { isLoading: isDisputeConfirming, isSuccess: isDisputeSuccess } = useWaitForTransactionReceipt({ hash: disputeHash })
    const { isLoading: isResolveConfirming, isSuccess: isResolveSuccess } = useWaitForTransactionReceipt({ hash: resolveHash })


    // Cross-matching: check wallet (address) and towns identity (identityAddress/userId)
    // against both DB stored address (usually F17) and user_id (usually 063)
    const isSeller = (address?.toLowerCase() === deal?.seller_address?.toLowerCase()) ||
        (address?.toLowerCase() === deal?.seller_user_id?.toLowerCase()) ||
        (identityAddress?.toLowerCase() === deal?.seller_address?.toLowerCase()) ||
        (identityAddress?.toLowerCase() === deal?.seller_user_id?.toLowerCase()) ||
        (townsAddress?.toLowerCase() === deal?.seller_address?.toLowerCase()) ||
        (townsUserId?.toLowerCase() === deal?.seller_user_id?.toLowerCase())

    const isBuyer = (address?.toLowerCase() === deal?.buyer_address?.toLowerCase()) ||
        (address?.toLowerCase() === deal?.buyer_user_id?.toLowerCase()) ||
        (identityAddress?.toLowerCase() === deal?.buyer_address?.toLowerCase()) ||
        (identityAddress?.toLowerCase() === deal?.buyer_user_id?.toLowerCase()) ||
        (townsAddress?.toLowerCase() === deal?.buyer_address?.toLowerCase()) ||
        (townsUserId?.toLowerCase() === deal?.buyer_user_id?.toLowerCase())

    // Blockchain Reads (Dual Allowance Scan)
    const { data: allowanceSigner, refetch: refetchAllowanceSigner } = useReadContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: address && onChainEscrow ? [address as `0x${string}`, onChainEscrow] : undefined,
    })

    const { data: allowanceSmart, refetch: refetchAllowanceSmart } = useReadContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: townsAddress && onChainEscrow ? [townsAddress as `0x${string}`, onChainEscrow] : undefined,
    })

    const refetchAllowance = () => {
        refetchAllowanceSigner()
        refetchAllowanceSmart()
    }


    useEffect(() => {
        if (onChainEscrow) {
            refetchAllowance()
        }
    }, [onChainEscrow, address, townsAddress, isBuyer, deal?.buyer_address]) // Added more deps for safety

    // Trigger refetch on any relevant success or status change
    useEffect(() => {
        if (isApproveSuccess || isFundSuccess || deal?.status === 'created') {
            refetchAllowance()
            syncBlockchainState()
        }
    }, [isApproveSuccess, isFundSuccess, deal?.status])

    // Force TownsContext to use the deal's smart wallet address if we are the buyer
    useEffect(() => {
        if (isTowns && isBuyer && deal?.buyer_address) {
            if (deal.buyer_address.toLowerCase() !== townsAddress?.toLowerCase()) {
                console.log('Towns: Forcing smart wallet address from deal:', deal.buyer_address)
                setTownsAddress(deal.buyer_address)
            }
        }
    }, [isTowns, isBuyer, deal?.buyer_address, townsAddress, setTownsAddress])

    // Logic Functions
    const loadDeal = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true)
            const data = await getDeal(dealId)
            if (!data) {
                setError('Deal not found')
            } else {
                setDeal(data)
                setError(null)
                if (data.escrow_address) {
                    setOnChainEscrow(data.escrow_address as `0x${string}`)
                }
                return data
            }
            return null
        } catch (err) {
            if (showLoading) setError('Failed to load deal')
            console.error(err)
            return null
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    const syncBlockchainState = async () => {
        if (!deal || !publicClient) return
        try {
            const targetMemoHash = keccak256(toHex(deal.deal_id))

            if (!onChainEscrow) {
                let escrows: `0x${string}`[] = []

                // Get escrows from both sides
                const buyerData = await publicClient.readContract({
                    address: FACTORY_ADDRESS,
                    abi: factoryAbi,
                    functionName: 'getBuyerEscrows',
                    args: [deal.buyer_address as `0x${string}`],
                }).catch(() => []) as `0x${string}`[]

                const sellerData = await publicClient.readContract({
                    address: FACTORY_ADDRESS,
                    abi: factoryAbi,
                    functionName: 'getSellerEscrows',
                    args: [deal.seller_address as `0x${string}`],
                }).catch(() => []) as `0x${string}`[]

                escrows = Array.from(new Set([...buyerData, ...sellerData]))

                // Check memoHash for each to find the right one
                for (const escrowAddr of escrows.reverse()) {
                    try {
                        const info = await publicClient.readContract({
                            address: escrowAddr,
                            abi: escrowAbi,
                            functionName: 'getDealInfo',
                        }) as any

                        if (info[6] === targetMemoHash) {
                            setOnChainEscrow(escrowAddr)
                            setDeal(prev => prev ? { ...prev, escrow_address: escrowAddr, status: 'created' as Deal['status'] } : prev)
                            updateDealStatus(deal.deal_id, 'created', escrowAddr).catch(() => { })
                            break
                        }
                    } catch (e) { }
                }
            }

            if (onChainEscrow) {
                const info = await publicClient.readContract({
                    address: onChainEscrow,
                    abi: escrowAbi,
                    functionName: 'getDealInfo',
                }) as any

                if (info) {
                    const chainStatus = info[7]
                    const statusMap: Record<number, string> = {
                        0: 'created', 1: 'funded', 2: 'released', 3: 'refunded', 4: 'disputed', 5: 'resolved',
                    }
                    const newStatus = statusMap[chainStatus] || 'created'

                    if (newStatus === 'resolved' && !winnerAddr) {
                        try {
                            const logs = await publicClient.getContractEvents({
                                address: onChainEscrow,
                                abi: escrowAbi,
                                eventName: 'DisputeResolved',
                                fromBlock: BigInt(0),
                            })
                            if (logs.length > 0) {
                                setWinnerAddr(logs[0].args.winner as string)
                            }
                        } catch (e) {
                            console.error('Failed to fetch resolution logs', e)
                        }
                    }

                    if (deal.status !== newStatus) {
                        setDeal(prev => prev ? { ...prev, status: newStatus as Deal['status'] } : prev)
                        updateDealStatus(deal.deal_id, newStatus, onChainEscrow).catch(() => { })
                    }
                }
                // Force allowance check on every sync cycle when in 'created' state
                if (deal.status === 'created') {
                    refetchAllowance()
                }
            }
        } catch (err) { console.error('Sync error:', err) }
    }

    useEffect(() => {
        if (!dealId) return
        loadDeal(true)

        // Aggressive polling to pick up bot/blockchain changes
        const interval = setInterval(() => loadDeal(false), 3000)
        return () => clearInterval(interval)
    }, [dealId])

    useEffect(() => {
        if (deal) {
            syncBlockchainState()
            // More frequent sync when in 'created' or 'funded' state to pick up txs faster
            const intervalSecs = (deal.status === 'created' || deal.status === 'funded') ? 3000 : 7000
            const interval = setInterval(() => syncBlockchainState(), intervalSecs)
            return () => clearInterval(interval)
        }
    }, [deal?.deal_id, address, townsAddress, identityAddress, deal?.status])


    useEffect(() => {
        if (isCreateSuccess && createReceipt && deal) {
            const handleSuccess = async () => {
                setTxStatus('Confirmed! Syncing...')
                for (const log of createReceipt.logs) {
                    if (log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
                        const escrowAddressTopic = log.topics[1]
                        if (escrowAddressTopic) {
                            const escrowAddress = `0x${escrowAddressTopic.slice(-40)}` as `0x${string}`
                            setOnChainEscrow(escrowAddress)
                            setDeal(prev => prev ? { ...prev, status: 'created' as Deal['status'], escrow_address: escrowAddress } : prev)
                            setTxStatus('Escrow Deployed!')
                            updateDealStatus(deal.deal_id, 'created', escrowAddress).catch(() => { })
                            return
                        }
                    }
                }
                setOnChainEscrow(null)
                syncBlockchainState()
            }
            handleSuccess()
        }
    }, [isCreateSuccess, createReceipt])

    useEffect(() => {
        if (isFundSuccess || isReleaseSuccess || isRefundSuccess || isDisputeSuccess || isResolveSuccess) {
            setTimeout(() => syncBlockchainState(), 2000)
        }
    }, [isFundSuccess, isReleaseSuccess, isRefundSuccess, isDisputeSuccess, isResolveSuccess])

    const handleTx = async (fn: any, statusText: string) => {
        try {
            setTxStatus(statusText)
            fn()
        } catch (err) {
            console.error(err)
            setTxStatus('Failed')
            setTimeout(() => setTxStatus(null), 3000)
        }
    }

    // Network Check
    const { switchChain } = useSwitchChain()
    const { chainId } = useAccount()
    const isWrongNetwork = chainId !== 8453 && !!address

    const handleSwitchNetwork = () => {
        switchChain({ chainId: 8453 })
    }

    // Prevent hydration mismatch
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const { data: balanceData, refetch: refetchBalance } = useBalance({
        address: effectiveAddress as `0x${string}`,
        token: USDC_ADDRESS,
        chainId: 8453, // Base
    })

    // Auto-refresh balance more aggressively
    useEffect(() => {
        if (effectiveAddress) {
            const interval = setInterval(() => refetchBalance(), 5000)
            return () => clearInterval(interval)
        }
    }, [effectiveAddress, refetchBalance])

    const checkNetwork = () => {
        if (isWrongNetwork) {
            handleSwitchNetwork()
            return false
        }
        return true
    }

    const handleCreateEscrow = async () => {
        if (!deal) return
        if (isTowns && (channelId || deal?.channel_id)) {
            console.log('[Towns] handleCreateEscrow using channelId:', channelId || deal?.channel_id)
            try {
                setActiveAction('create')
                setTxStatus('Requesting...')
                await requestTransaction(deal.deal_id, 'create', deal?.channel_id)
                setTxStatus('Request Sent! Check Chat')
                setTimeout(() => setTxStatus(null), 5000)
                return
            } catch (e) {
                setActiveAction(null)
                setTxStatus('Failed')
                setTimeout(() => setTxStatus(null), 3000)
                return
            }
        }
        if (!checkNetwork()) return
        if (!deal || !address) return
        setIsProcessing(true)
        setActiveAction('create')
        const amount = parseUsdcAmount(deal.amount)
        const memoHash = keccak256(toHex(deal.deal_id))
        handleTx(async () => {
            try {
                await createEscrow({
                    address: FACTORY_ADDRESS,
                    abi: factoryAbi,
                    functionName: 'createEscrow',
                    args: [deal.seller_address as `0x${string}`, USDC_ADDRESS, amount, BigInt(deal.deadline), ARBITRATOR_ADDRESS, memoHash],
                })
            } catch (e) {
                setActiveAction(null)
                throw e
            } finally {
                setIsProcessing(false)
            }
        }, 'Creating...')
    }

    const handleApproveUsdc = async () => {
        if (isTowns && (channelId || deal?.channel_id) && deal?.deal_id) {
            console.log('[Towns] handleApproveUsdc using channelId:', channelId || deal?.channel_id)
            try {
                setActiveAction('approve')
                setTxStatus('Requesting...')
                await requestTransaction(deal.deal_id, 'approve', deal?.channel_id)
                setTxStatus('Request Sent! Check Chat')
                setTimeout(() => setTxStatus(null), 5000)
                return
            } catch (e) {
                setActiveAction(null)
                setTxStatus('Failed')
                setTimeout(() => setTxStatus(null), 3000)
                return
            }
        }
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        setIsProcessing(true)
        setActiveAction('approve')
        const amount = parseUsdcAmount(deal.amount)
        handleTx(async () => {
            try {
                await approveUsdc({
                    address: USDC_ADDRESS,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [deal.escrow_address as `0x${string}`, amount],
                })
            } catch (e) {
                setActiveAction(null)
                throw e
            } finally {
                setIsProcessing(false)
            }
        }, 'Approving...')
    }

    const handleFundEscrow = async () => {
        if (isTowns && (channelId || deal?.channel_id) && deal?.deal_id) {
            console.log('[Towns] handleFundEscrow using channelId:', channelId || deal?.channel_id)
            try {
                setActiveAction('fund')
                setTxStatus('Requesting...')
                await requestTransaction(deal.deal_id, 'fund', deal?.channel_id)
                setTxStatus('Request Sent! Check Chat')
                setTimeout(() => setTxStatus(null), 5000)
                return
            } catch (e) {
                setActiveAction(null)
                setTxStatus('Failed')
                setTimeout(() => setTxStatus(null), 3000)
                return
            }
        }
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        setIsProcessing(true)
        setActiveAction('fund')
        handleTx(async () => {
            try {
                await fundEscrow({
                    address: deal.escrow_address as `0x${string}`,
                    abi: escrowAbi,
                    functionName: 'fund',
                })
            } catch (e) {
                setActiveAction(null)
                throw e
            } finally {
                setIsProcessing(false)
            }
        }, 'Funding...')
    }

    const handleReleaseFunds = async () => {
        if (isTowns && (channelId || deal?.channel_id) && deal?.deal_id) {
            console.log('[Towns] handleReleaseFunds using channelId:', channelId || deal?.channel_id)
            try {
                setActiveAction('release')
                setTxStatus('Requesting...')
                // Force sync to ensure bot has latest address
                const freshDeal = await loadDeal(false)
                await requestTransaction(deal.deal_id, 'release', channelId || freshDeal?.channel_id || deal?.channel_id)
                setTxStatus('Request Sent! Check Chat')
                setTimeout(() => setTxStatus(null), 5000)
                return
            } catch (e) {
                setActiveAction(null)
                setTxStatus('Failed')
                setTimeout(() => setTxStatus(null), 3000)
                return
            }
        } else {
            console.log('[Towns] handleReleaseFunds: Skipping bot interaction', { isTowns, channelId, dealChannelId: deal?.channel_id })
        }
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        setIsProcessing(true)
        setActiveAction('release')
        handleTx(async () => {
            try {
                await releaseEscrow({
                    address: deal.escrow_address as `0x${string}`,
                    abi: escrowAbi,
                    functionName: 'release',
                })
            } catch (e) {
                setActiveAction(null)
                throw e
            } finally {
                setIsProcessing(false)
            }
        }, 'Releasing...')
    }

    const handleRefund = async () => {
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        setIsProcessing(true)
        setActiveAction('refund')
        handleTx(async () => {
            try {
                await refundEscrow({
                    address: deal.escrow_address as `0x${string}`,
                    abi: escrowAbi,
                    functionName: 'refundAfterDeadline',
                })
            } catch (e) {
                setActiveAction(null)
                throw e
            } finally {
                setIsProcessing(false)
            }
        }, 'Refunding...')
    }

    const handleDispute = async () => {
        if (isTowns && (channelId || deal?.channel_id) && deal?.deal_id) {
            console.log('[Towns] handleDispute using channelId:', channelId || deal?.channel_id)
            try {
                setActiveAction('dispute')
                setTxStatus('Requesting...')
                // Force sync
                const freshDeal = await loadDeal(false)
                await requestTransaction(deal.deal_id, 'dispute', channelId || freshDeal?.channel_id || deal?.channel_id)
                setTxStatus('Request Sent! Check Chat')
                setTimeout(() => setTxStatus(null), 5000)
                return
            } catch (e) {
                setActiveAction(null)
                setTxStatus('Failed')
                setTimeout(() => setTxStatus(null), 3000)
                return
            }
        } else {
            console.log('[Towns] handleDispute: Skipping bot interaction', { isTowns, channelId, dealChannelId: deal?.channel_id })
        }
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        setIsProcessing(true)
        setActiveAction('dispute')
        handleTx(async () => {
            try {
                await openDispute({
                    address: deal.escrow_address as `0x${string}`,
                    abi: escrowAbi,
                    functionName: 'openDispute',
                })
            } catch (e) {
                setActiveAction(null)
                throw e
            } finally {
                setIsProcessing(false)
            }
        }, 'Disputing...')
    }

    const isAnyTxPending = isCreating || isApproving || isFunding || isReleasing || isRefunding || isDisputing || isResolving ||
        isCreateConfirming || isApproveConfirming || isFundConfirming || isReleaseConfirming || isRefundConfirming || isDisputeConfirming || isResolveConfirming ||
        isTownsTxPending

    // Allowance Logic: True if BOTH wallets lack allowance
    const signerAllowance = allowanceSigner !== undefined ? allowanceSigner : BigInt(0)
    const smartAllowance = allowanceSmart !== undefined ? allowanceSmart : BigInt(0)
    const hasAllowance = (signerAllowance >= parseUsdcAmount(deal?.amount || 0)) ||
        (smartAllowance >= parseUsdcAmount(deal?.amount || 0))

    const needsApproval = !!(onChainEscrow && !hasAllowance)
    const isDeadlinePassed = deal ? Date.now() > deal.deadline * 1000 : false

    // Debug logging
    useEffect(() => {
        console.log('DealClient Debug:', {
            wagmiAddress: address,
            townsAddress,
            identityAddress,
            isBuyer,
            isSeller,
            needsApproval,
            signerAllowance: signerAllowance?.toString(),
            smartAllowance: smartAllowance?.toString(),
            hasAllowance,
            onChainEscrow,
            dealBuyer: deal?.buyer_address,
            dealSeller: deal?.seller_address
        })
    }, [address, townsAddress, identityAddress, isBuyer, isSeller, needsApproval, signerAllowance, smartAllowance, hasAllowance, onChainEscrow, deal])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center font-black">
                <div className="text-4xl animate-pulse uppercase tracking-tighter">Initializing...</div>
            </div>
        )
    }

    if (error || !deal) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-10 font-black">
                <div className="text-9xl mb-10">❌</div>
                <h1 className="text-5xl uppercase tracking-tighter mb-4 text-red-500">{error || 'Deal not found'}</h1>
                <Link href="/" className="px-10 py-5 border-4 border-white hover:bg-white hover:text-black transition-all uppercase tracking-widest">Back Home</Link>
            </div>
        )
    }

    const statusConfigs: Record<string, { label: string; color: string }> = {
        draft: { label: 'DRAFT', color: 'text-zinc-500' },
        created: { label: 'CREATED', color: 'text-blue-500' },
        funded: { label: 'FUNDED', color: 'text-green-500' },
        released: { label: 'COMPLETED', color: 'text-purple-500' },
        refunded: { label: 'REFUNDED', color: 'text-red-500' },
        disputed: { label: 'DISPUTE', color: 'text-orange-500' },
        resolved: { label: 'RESOLVED', color: 'text-cyan-500' }
    }
    const statusConfig = statusConfigs[deal.status] || { label: (deal.status as string).toUpperCase(), color: 'text-white' }

    return (
        <div className="min-h-screen bg-[#050505] relative overflow-hidden font-sans pb-20">
            <GlobalInteractiveGrid status={deal.status} />
            <div className="bg-noise" />

            {/* Header removed to use Global Header from layout.tsx */}

            <main className="relative z-10 max-w-6xl mx-auto px-10 py-20 space-y-12 animate-[fadeIn_0.5s_ease-out] scale-down-pro">
                <StatusStepper status={deal.status} />

                {/* Console Log Notifications (Silent & Tactile) */}
                <ConsoleLog messages={consoleMessages} />

                {/* DEBUG PANEL - Hidden but can be seen in console or toggled if needed */}
                <div className="sr-only" aria-hidden="true">
                    Debug: {JSON.stringify({ address, isBuyer, needsApproval, signerAllowance: signerAllowance?.toString(), smartAllowance: smartAllowance?.toString() })}
                </div>

                {/* Status Hero */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-10 pb-20 border-b-8 border-white">
                    <div className="text-center md:text-left space-y-4">
                        <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white uppercase leading-none">
                            DEAL <span className="text-brand-gradient">SUMMARY</span>
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <p className="font-industrial-mono text-zinc-500 text-2xl tracking-tighter">ID: {deal.deal_id}</p>
                            <button onClick={() => {
                                navigator.clipboard.writeText(deal.deal_id);
                                notify('ID_COPIED_TO_CLIPBOARD');
                            }} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                            </button>
                            {/* NEW: Refresh Button */}
                            <button
                                onClick={() => {
                                    setTxStatus('REFRESHING...')
                                    loadDeal(false)
                                    syncBlockchainState()
                                    refetchAllowance()
                                    setTimeout(() => setTxStatus(null), 1000)
                                }}
                                className="ml-4 p-3 bg-white/5 border-2 border-white/10 hover:border-white/40 text-zinc-400 hover:text-white transition-all rounded-lg flex items-center gap-2"
                                title="Sync Blockchain State"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${txStatus === 'REFRESHING...' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="text-xs font-black uppercase tracking-widest hidden md:inline">Refresh</span>
                            </button>
                        </div>
                    </div>
                    <div
                        onMouseEnter={() => setIsStatusHovered(true)}
                        onMouseLeave={() => setIsStatusHovered(false)}
                        className="px-12 py-8 bg-white text-black font-black text-5xl tracking-tighter uppercase italic border-b-[12px] border-zinc-400 cursor-default transition-all duration-300 min-w-[300px] text-center"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isStatusHovered ? 'info' : 'status'}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isStatusHovered ? (
                                    <span className="font-industrial-mono">{deal.amount} {deal.token}</span>
                                ) : (
                                    statusConfig.label
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <Card title="PARTICIPANTS" status={deal.status} isProcessing={isProcessing}>
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black ml-1">SELLER</label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-4 mb-2">
                                        <MemberAvatar
                                            userId={deal.seller_user_id || ''}
                                            streamId={deal.channel_id || channelId || ''}
                                            fallbackName={deal.seller_display_name || 'Seller'}
                                            fallbackUrl={deal.seller_pfp_url}
                                            size="md"
                                        />
                                        <span className="text-3xl font-black text-white uppercase tracking-tighter">
                                            {deal.seller_display_name || 'SELLER'}
                                        </span>
                                    </div>
                                    <div className="bg-black border-[4px] border-white/20 p-6 font-industrial-mono text-xl text-white break-all relative group/addr">
                                        {/* Display Smart Account (F17) with a label if it's different from the User ID */}
                                        <div className="flex flex-col gap-1">
                                            <span>{deal.seller_address}</span>
                                            {deal.seller_user_id && deal.seller_user_id.toLowerCase() !== deal.seller_address.toLowerCase() && (
                                                <span className="text-zinc-500 text-sm uppercase font-black">Linked ID: {deal.seller_user_id.slice(0, 6)}...{deal.seller_user_id.slice(-4)}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(deal.seller_address);
                                                notify('ADDRESS_COPIED');
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/addr:opacity-100 transition-opacity p-2 text-zinc-500 hover:text-white"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                            </svg>
                                        </button>
                                        {isSeller && (
                                            <span className="absolute -top-4 -right-4 px-3 py-1 bg-white text-black text-xs font-black uppercase shadow-xl transform rotate-3">YOU</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black ml-1">BUYER</label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-4 mb-2">
                                        <MemberAvatar
                                            userId={deal.buyer_user_id || ''}
                                            streamId={deal.channel_id || channelId || ''}
                                            fallbackName={deal.buyer_display_name || 'Buyer'}
                                            fallbackUrl={deal.buyer_pfp_url}
                                            size="md"
                                        />
                                        <span className="text-3xl font-black text-white uppercase tracking-tighter">
                                            {deal.buyer_display_name || 'BUYER'}
                                        </span>
                                    </div>
                                    <div className="bg-black border-[4px] border-white/20 p-6 font-industrial-mono text-xl text-white break-all relative group/addr">
                                        {/* Display Smart Account (F17) with a label if it's different from the User ID */}
                                        <div className="flex flex-col gap-1">
                                            <span>{deal.buyer_address}</span>
                                            {deal.buyer_user_id && deal.buyer_user_id.toLowerCase() !== deal.buyer_address.toLowerCase() && (
                                                <span className="text-zinc-500 text-sm uppercase font-black">Linked ID: {deal.buyer_user_id.slice(0, 6)}...{deal.buyer_user_id.slice(-4)}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(deal.buyer_address);
                                                notify('ADDRESS_COPIED');
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/addr:opacity-100 transition-opacity p-2 text-zinc-500 hover:text-white"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                            </svg>
                                        </button>
                                        {isBuyer && (
                                            <span className="absolute -top-4 -right-4 px-3 py-1 bg-white text-black text-xs font-black uppercase shadow-xl transform -rotate-3">YOU</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="ASSET INFO" status={deal.status} isProcessing={isProcessing}>
                        <div className="space-y-16">
                            <div className="space-y-4">
                                <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black ml-1">TOTAL VALUE</label>
                                <div className="flex items-baseline gap-6">
                                    <span className="text-8xl font-black tracking-tighter text-white font-industrial-mono">{deal.amount}</span>
                                    <span className="text-3xl font-black text-zinc-500 uppercase tracking-widest">{deal.token}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-10 pt-10 border-t-8 border-white/5">
                                <div className="space-y-3">
                                    <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black">REMAINING</label>
                                    <p className={`text-4xl font-black tracking-tighter font-industrial-mono ${isDeadlinePassed ? 'text-red-500' : 'text-white'}`}>
                                        <CountdownTimer deadline={deal.deadline} />
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black">NETWORK</label>
                                    <p className={`text-4xl font-black tracking-tighter uppercase ${isWrongNetwork ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                        {isWrongNetwork ? 'WRONG NET' : 'BASE'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card title="TERMS & NOTES" status={deal.status} isProcessing={isProcessing}>
                    <p className="text-2xl text-zinc-300 leading-relaxed font-bold tracking-tight">
                        {deal.description || "No specific terms provided."}
                    </p>
                </Card>

                <Card title="EXECUTION" className="p-16 relative overflow-visible mt-40" showCharacter={true} status={deal.status} isProcessing={isProcessing}>
                    {deal.status === 'released' && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="scanline-effect" />
                            <motion.div
                                initial={{ scale: 2, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", damping: 10, stiffness: 100 }}
                                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                            >
                                <div className="border-[12px] border-matrix-green px-12 py-6 text-matrix-green text-8xl font-black -rotate-12 bg-black/80 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                                    EXECUTED
                                </div>
                            </motion.div>
                        </div>
                    )}
                    <div className="space-y-12">
                        {deal.status === 'draft' && (
                            <div className="space-y-12">
                                <p className="text-zinc-500 text-3xl leading-relaxed italic font-bold max-w-2xl">
                                    "Initialize the secure escrow contract on-chain to proceed."
                                </p>
                                {(!address && !identityAddress && !townsAddress) ? (
                                    <div className="p-16 border-8 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center gap-10">
                                        <p className="text-sm text-zinc-500 font-black uppercase tracking-[0.5em]">AUTHORIZATION REQUIRED</p>
                                        <ConnectButton />
                                    </div>
                                ) : isWrongNetwork ? (
                                    <button onClick={handleSwitchNetwork} className="w-full bg-red-600 text-white font-black py-10 rounded-none text-4xl uppercase tracking-tighter hover:bg-red-500 transition-all border-b-[16px] border-red-800 active:translate-y-2 active:border-b-[8px]">
                                        SWITCH TO BASE
                                    </button>
                                ) : isBuyer ? (
                                    <button onClick={handleCreateEscrow} disabled={isProcessing} className="w-full bg-white text-black font-black py-10 rounded-none text-4xl uppercase tracking-tighter hover:bg-zinc-200 transition-all border-b-[16px] border-zinc-300 active:translate-y-2 active:border-b-[8px] flex items-center justify-center gap-6">
                                        {(isCreating || isCreateConfirming || activeAction === 'create' || isProcessing) && <LoadingSpinner size="h-10 w-10" />}
                                        {isCreating || isCreateConfirming || activeAction === 'create' || isProcessing ? 'INITIALIZING...' : 'DEPLOY ESCROW CONTRACT'}
                                    </button>
                                ) : (
                                    <div className="p-12 bg-white/5 border-4 border-white/10 text-center">
                                        <p className="text-zinc-500 font-black uppercase tracking-widest text-2xl">Awaiting buyer initialization...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {deal.status === 'created' && (
                            <div className="space-y-12">
                                <div className="p-10 border-l-8 border-blue-500 bg-blue-500/5">
                                    <p className="text-white text-2xl font-black uppercase tracking-tight">
                                        Escrow deployed. Deposit <span className="text-blue-500">{deal.amount} {deal.token}</span> to fund.
                                    </p>
                                </div>
                                {isWrongNetwork ? (
                                    <button onClick={handleSwitchNetwork} className="w-full bg-red-600 text-white font-black py-10 rounded-none text-4xl uppercase tracking-tighter hover:bg-red-500 transition-all border-b-[16px] border-red-800 active:translate-y-2 active:border-b-[8px]">
                                        SWITCH TO BASE
                                    </button>
                                ) : isBuyer ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <button onClick={handleApproveUsdc} disabled={!needsApproval || isProcessing} className={`py-8 px-10 border-4 font-black text-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-4 ${!needsApproval ? 'border-zinc-800 text-zinc-600 bg-zinc-900 pointer-events-none' : 'border-white text-white hover:bg-white/10'}`}>
                                            {(isApproving || isApproveConfirming || activeAction === 'approve' || isProcessing) && <LoadingSpinner />}
                                            {!needsApproval ? 'APPROVED' : '1. ALLOW USDC'}
                                        </button>
                                        <button onClick={handleFundEscrow} disabled={needsApproval || isProcessing} className="py-8 px-10 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-black text-2xl uppercase tracking-widest transition-all border-b-[12px] border-zinc-300 active:translate-y-2 active:border-b-[6px] flex items-center justify-center gap-4">
                                            {(isFunding || isFundConfirming || activeAction === 'fund' || isProcessing) && <LoadingSpinner />}
                                            {isFunding || isFundConfirming || activeAction === 'fund' || isProcessing ? 'FUNDING...' : '2. DEPOSIT FUNDS'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-12 bg-white/5 border-4 border-white/10 text-center">
                                        <p className="text-zinc-500 font-black uppercase tracking-widest text-2xl">Waiting for buyer deposit...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {deal.status === 'funded' && (
                            <div className="space-y-12">
                                <div className="p-10 border-l-8 border-green-500 bg-green-500/5 text-center">
                                    <p className="text-green-500 text-3xl font-black uppercase tracking-widest">🛡️ SECURED IN PROTOCOL</p>
                                </div>
                                {isWrongNetwork ? (
                                    <button onClick={handleSwitchNetwork} className="w-full bg-red-600 text-white font-black py-10 rounded-none text-4xl uppercase tracking-tighter hover:bg-red-500 transition-all border-b-[16px] border-red-800 active:translate-y-2 active:border-b-[8px]">
                                        SWITCH TO BASE
                                    </button>
                                ) : isBuyer ? (
                                    <div className="space-y-6">
                                        <button onClick={handleReleaseFunds} disabled={isAnyTxPending || isProcessing} className="w-full bg-white text-black font-black py-10 rounded-none text-5xl uppercase tracking-tighter hover:bg-zinc-200 transition-all border-b-[16px] border-zinc-300 active:translate-y-2 active:border-b-[8px] flex items-center justify-center gap-6">
                                            {(isReleasing || isReleaseConfirming || activeAction === 'release' || isProcessing || isTownsTxPending) && <LoadingSpinner size="h-12 w-12" />}
                                            {isReleasing || isReleaseConfirming || activeAction === 'release' || isProcessing || isTownsTxPending ? 'RELEASING...' : 'RELEASE TO SELLER'}
                                        </button>
                                        <button onClick={handleDispute} disabled={isAnyTxPending || isProcessing} className="w-full py-6 text-zinc-500 hover:text-white font-black uppercase tracking-[0.2em] text-lg transition-all underline decoration-4 underline-offset-8 flex items-center justify-center gap-4">
                                            {(isDisputing || isDisputeConfirming || activeAction === 'dispute' || isProcessing || isTownsTxPending) && <LoadingSpinner size="h-5 w-5" />}
                                            OPEN DISPUTE
                                        </button>
                                    </div>
                                ) : isSeller ? (
                                    <div className="p-12 bg-white/5 border-4 border-white/10 text-center">
                                        <p className="text-zinc-500 font-black uppercase tracking-widest text-2xl">Waiting for buyer release...</p>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {(deal.status === 'released' || deal.status === 'refunded' || deal.status === 'disputed' || deal.status === 'resolved') && (
                            <div className="text-center py-20 space-y-10 border-4 border-white bg-white/5">
                                <div className="text-9xl mb-8">
                                    {deal.status === 'released' ? '💎' : deal.status === 'refunded' ? '↩️' : deal.status === 'resolved' ? '⚖️✅' : '⚖️'}
                                </div>
                                <h4 className="text-6xl font-black text-white uppercase tracking-tighter">
                                    {deal.status === 'released' ? 'DEAL COMPLETED' : deal.status === 'refunded' ? 'DEAL REFUNDED' : deal.status === 'resolved' ? 'DISPUTE RESOLVED' : 'DEAL IN DISPUTE'}
                                </h4>
                                <p className="text-zinc-400 max-w-xl mx-auto text-2xl font-bold italic">
                                    {deal.status === 'released' ? 'Assets successfully transferred to target address.' :
                                        deal.status === 'refunded' ? 'Funds returned to originator.' :
                                            deal.status === 'resolved' ? (
                                                winnerAddr ? (
                                                    winnerAddr.toLowerCase() === deal.seller_address.toLowerCase()
                                                        ? 'Arbiter resolved dispute in favor of SELLER. Funds transferred.'
                                                        : 'Arbiter resolved dispute in favor of BUYER. Funds returned.'
                                                ) : 'Arbitrator has properly distributed the funds.'
                                            ) :
                                                'Protocol arbiter is reviewing the transaction.'}
                                </p>

                                {/* Arbitrator Actions */}
                                {deal.status === 'disputed' && address?.toLowerCase() === ARBITRATOR_ADDRESS.toLowerCase() && (
                                    <div className="mt-10 p-10 border-t-4 border-white/10">
                                        <p className="text-orange-500 font-black uppercase tracking-widest text-xl mb-6">👮 ARBITRATOR CONTROLS</p>
                                        <div className="grid grid-cols-2 gap-8">
                                            <button
                                                onClick={() => {
                                                    setIsProcessing(true)
                                                    setActiveAction('resolve')
                                                    handleTx(async () => {
                                                        try {
                                                            await resolveDispute({
                                                                address: deal.escrow_address as `0x${string}`,
                                                                abi: escrowAbi,
                                                                functionName: 'resolve',
                                                                args: [false]
                                                            })
                                                        } catch (e) {
                                                            setActiveAction(null)
                                                            throw e
                                                        } finally {
                                                            setIsProcessing(false)
                                                        }
                                                    }, 'Ruling for Buyer...')
                                                }}
                                                disabled={isProcessing}
                                                className="py-6 border-4 border-white hover:bg-white hover:text-black font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4">
                                                {(isResolving || isResolveConfirming || activeAction === 'resolve' || isProcessing) && <LoadingSpinner />}
                                                WINNER: BUYER
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsProcessing(true)
                                                    setActiveAction('resolve')
                                                    handleTx(async () => {
                                                        try {
                                                            await resolveDispute({
                                                                address: deal.escrow_address as `0x${string}`,
                                                                abi: escrowAbi,
                                                                functionName: 'resolve',
                                                                args: [true]
                                                            })
                                                        } catch (e) {
                                                            setActiveAction(null)
                                                            throw e
                                                        } finally {
                                                            setIsProcessing(false)
                                                        }
                                                    }, 'Ruling for Seller...')
                                                }}
                                                disabled={isProcessing}
                                                className="py-6 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest transition-all border-b-[8px] border-zinc-300 active:translate-y-1 active:border-b-[4px] flex items-center justify-center gap-4">
                                                {(isResolving || isResolveConfirming || activeAction === 'resolve' || isProcessing) && <LoadingSpinner />}
                                                WINNER: SELLER
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Footer Fees */}
                <div className="pt-20 space-y-20">
                    <div className="pt-20 border-t-2 border-dashed border-white/20">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-16">
                            <div className="space-y-4">
                                <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                                    PROTOCOL <span className="text-brand-gradient">FEE</span>
                                </h3>
                                <p className="text-zinc-500 text-xl font-medium max-w-xl italic">
                                    Automated commission handled in TOWNS. No manual interaction required.
                                </p>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="flex flex-col items-end">
                                    <div className="relative group/toggle flex items-center bg-zinc-950 border-4 border-zinc-800 p-1.5 rounded-full w-40 h-20 transition-all hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                                        <div className="absolute right-2 w-14 h-14 bg-green-500 rounded-full shadow-[0_0_15px_#22c55e] transition-transform" />
                                        <span className="ml-6 text-base font-black text-green-500 tracking-widest">ON</span>
                                    </div>
                                </div>
                                <div className="px-12 py-8 border-4 border-white/10 text-white font-black uppercase tracking-tighter text-4xl whitespace-nowrap bg-white/5 transition-all duration-500 hover:border-green-500 hover:text-green-400 hover:bg-green-500/10 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] group rounded-xl flex items-center gap-2">
                                    <span className="text-zinc-500 text-5xl">$</span>
                                    <span className="text-brand-gradient group-hover:from-green-400 group-hover:to-green-600 transition-all font-black text-6xl">TOWNS</span>
                                    <span className="text-green-500 text-5xl ml-1">3%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {deal.escrow_address && (
                        <div className="border-2 border-white/10 p-12 bg-[#09090b] relative group/contract rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:border-green-500/50 hover:shadow-[0_0_40px_rgba(34,197,94,0.15)]">
                            <div className="absolute top-0 right-10 -translate-y-1/2 bg-green-500 text-black px-6 py-2 font-black uppercase text-xs tracking-widest border-2 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)] z-30">VERIFIED</div>
                            <div className="space-y-6">
                                <label className="text-zinc-600 font-black uppercase tracking-[0.4em] text-sm group-hover/contract:text-green-500/50 transition-colors">ESCROW CONTRACT</label>
                                <div className="relative group/addr">
                                    <a href={`https://basescan.org/address/${deal.escrow_address}`} target="_blank" rel="noopener noreferrer" className="font-industrial-mono text-3xl text-zinc-300 hover:text-white break-all block leading-tight underline decoration-2 underline-offset-8 decoration-white/20 hover:decoration-white/50 transition-all">
                                        {deal.escrow_address}
                                    </a>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(deal.escrow_address!);
                                            notify('CONTRACT_COPIED');
                                        }}
                                        className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/addr:opacity-100 transition-opacity p-2 text-zinc-500 hover:text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
