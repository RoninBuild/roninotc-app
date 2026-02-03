'use client'
// Final sync: 2026-02-03T21:00:00Z

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient, useSwitchChain } from 'wagmi'
import { parseUnits, keccak256, toHex, zeroAddress } from 'viem'
import { getDeal, updateDealStatus } from '@/lib/api'
import { FACTORY_ADDRESS, USDC_ADDRESS, ARBITRATOR_ADDRESS, factoryAbi, escrowAbi, erc20Abi, parseUsdcAmount } from '@/lib/contracts'
import type { Deal } from '@/lib/types'
import Link from 'next/link'

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

function GlobalInteractiveGrid() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY })
        }
        window.addEventListener('mousemove', handleGlobalMouseMove)
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove)
    }, [])

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Spotlight Effect */}
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(168, 85, 247, 0.08), transparent 60%)`
                }}
            />

            {/* Pulsing Grid Squares Overlay */}
            <div className="absolute inset-0 opacity-[0.05]">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-white/20 animate-pulse"
                        style={{
                            width: '40px',
                            height: '40px',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDuration: `${3 + Math.random() * 7}s`,
                            animationDelay: `${Math.random() * 5}s`,
                            opacity: 0.1 + Math.random() * 0.4
                        }}
                    />
                ))}
            </div>
            {/* Fine Grid */}
            <div className="absolute inset-0 bg-grid opacity-[0.04]" />
        </div>
    )
}

// Refined Eyes / Peeking Logic
function CharacterPeeker({ mousePos, isHovered }: { mousePos: { x: number, y: number }, isHovered: boolean }) {
    return (
        <div className="absolute left-1/2 -top-[160px] -translate-x-1/2 w-[400px] h-[300px] pointer-events-none z-[-1] overflow-hidden transition-all duration-700">
            {/* Tighter Semi-circular shadow / Glow behind */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(0,0,0,0.9)_0%,transparent_70%)] opacity-90" />

            <div
                className="relative w-full h-full animate-[zoom-breathing_12s_infinite_ease-in-out]"
                style={{
                    transform: `translate(${mousePos.x * 0.002}px, ${mousePos.y * 0.002}px)`,
                }}
            >
                {/* Image - Darkened silhouette, almost invisible, just a holder for structure if needed, or fully hidden if requested "body not visible at all" */}
                {/* User asked: "personage... should not be visible in frames at all". "eyes are two dots... looking between frames". */}
                {/* We keep the image barely visible as a dark silhouette for "presence" but mostly hidden. */}
                <img
                    src="/assets/ronin.png"
                    alt="Ronin"
                    className="w-full h-full object-cover object-top filter brightness-0 opacity-0 transition-all duration-700"
                />

                {/* Glowing Purple Eyes - Blinking - Positioned manually to look like they are peeking from the gap */}
                {/* Adjusted positions based on standard ronin asset face location relative to top */}
                <div
                    className="absolute top-[35%] left-[45%] w-2 h-1.5 bg-[#A855F7] rounded-full blur-[1px] animate-[blink_4s_infinite_ease-in-out] shadow-[0_0_15px_#A855F7]"
                />
                <div
                    className="absolute top-[35%] left-[53%] w-2 h-1.5 bg-[#A855F7] rounded-full blur-[1px] animate-[blink_4s_infinite_ease-in-out] [animation-delay:0.2s] shadow-[0_0_15px_#A855F7]"
                />
            </div>
        </div>
    )
}

function Card({ children, title, className = "", showCharacter = false }: { children: React.ReactNode, title?: string, className?: string, showCharacter?: boolean }) {
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
            className={`relative bg-[#09090b] border-industrial rounded-none p-10 overflow-visible group/card transition-transform duration-300 hover:scale-[1.005] ${className}`}
        >
            {/* Mouse reactive grid overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                style={{
                    backgroundImage: 'radial-gradient(400px circle at var(--x) var(--y), rgba(255,255,255,0.08), transparent 80%)',
                    // @ts-ignore
                    '--x': `${mousePos.x}px`,
                    // @ts-ignore
                    '--y': `${mousePos.y}px`
                } as any}
            />
            <div className="card-grid-glow opacity-30" />

            {/* Depth Container for Character - Only visible OUTSIDE the card (Peeking from top) */}
            {showCharacter && (
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-[-1]">
                    <CharacterPeeker mousePos={mousePos} isHovered={isHovered} />
                </div>
            )}

            {/* IN-CARD character visibility removed as requested */}

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
    const [txStatus, setTxStatus] = useState<string | null>(null)

    // On-chain state
    const [onChainEscrow, setOnChainEscrow] = useState<`0x${string}` | null>(null)
    const [winnerAddr, setWinnerAddr] = useState<string | null>(null)

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

    const isSeller = address?.toLowerCase() === deal?.seller_address?.toLowerCase()
    const isBuyer = address?.toLowerCase() === deal?.buyer_address?.toLowerCase()

    // Blockchain Reads (Basic allowance only, Escrow status moved to publicClient for reliability)
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: address && onChainEscrow ? [address, onChainEscrow] : undefined,
    })

    useEffect(() => {
        if (onChainEscrow) {
            refetchAllowance()
        }
    }, [onChainEscrow, address])

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
            }
        } catch (err) {
            if (showLoading) setError('Failed to load deal')
            console.error(err)
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
                refetchAllowance()
            }
        } catch (err) { console.error('Sync error:', err) }
    }

    useEffect(() => { loadDeal(true) }, [dealId])
    useEffect(() => { if (deal) syncBlockchainState() }, [deal?.deal_id, deal?.buyer_address])

    useEffect(() => {
        if (!deal) return
        const interval = setInterval(() => syncBlockchainState(), 5000)
        return () => clearInterval(interval)
    }, [deal, onChainEscrow])

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

    const checkNetwork = () => {
        if (isWrongNetwork) {
            handleSwitchNetwork()
            return false
        }
        return true
    }

    const handleCreateEscrow = async () => {
        if (!checkNetwork()) return
        if (!deal || !address) return
        const amount = parseUsdcAmount(deal.amount)
        const memoHash = keccak256(toHex(deal.deal_id))
        handleTx(() => createEscrow({
            address: FACTORY_ADDRESS,
            abi: factoryAbi,
            functionName: 'createEscrow',
            args: [deal.seller_address as `0x${string}`, USDC_ADDRESS, amount, BigInt(deal.deadline), ARBITRATOR_ADDRESS, memoHash],
        }), 'Creating...')
    }

    const handleApproveUsdc = async () => {
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        const amount = parseUsdcAmount(deal.amount)
        handleTx(() => approveUsdc({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [deal.escrow_address as `0x${string}`, amount],
        }), 'Approving...')
    }

    const handleFundEscrow = async () => {
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        handleTx(() => fundEscrow({
            address: deal.escrow_address as `0x${string}`,
            abi: escrowAbi,
            functionName: 'fund',
        }), 'Funding...')
    }

    const handleReleaseFunds = async () => {
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        handleTx(() => releaseEscrow({
            address: deal.escrow_address as `0x${string}`,
            abi: escrowAbi,
            functionName: 'release',
        }), 'Releasing...')
    }

    const handleRefund = async () => {
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        handleTx(() => refundEscrow({
            address: deal.escrow_address as `0x${string}`,
            abi: escrowAbi,
            functionName: 'refundAfterDeadline',
        }), 'Refunding...')
    }

    const handleDispute = async () => {
        if (!checkNetwork()) return
        if (!deal?.escrow_address) return
        handleTx(() => openDispute({
            address: deal.escrow_address as `0x${string}`,
            abi: escrowAbi,
            functionName: 'openDispute',
        }), 'Disputing...')
    }

    const isAnyTxPending = isCreating || isApproving || isFunding || isReleasing || isRefunding ||
        isCreateConfirming || isApproveConfirming || isFundConfirming || isReleaseConfirming || isRefundConfirming

    // Use BigInt(0) if allowance is loading/undefined to force approval check
    const currentAllowance = allowance !== undefined ? allowance : BigInt(0)
    const needsApproval = !!(onChainEscrow && currentAllowance < parseUsdcAmount(deal?.amount || 0))
    const isDeadlinePassed = deal ? Date.now() > deal.deadline * 1000 : false

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
            <GlobalInteractiveGrid />
            <div className="bg-noise" />

            <header className="relative z-20 border-b-8 border-white bg-[#050505]">
                <div className="max-w-[1400px] mx-auto px-10 py-8 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <span className="font-black text-4xl tracking-tighter text-white uppercase flex items-center gap-2">
                            RONIN <span className="text-brand-gradient">OTC</span>
                        </span>
                    </Link>
                    <ConnectButton />
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-10 py-20 space-y-20 animate-[fadeIn_0.5s_ease-out] scale-down-pro">

                {/* Transaction Status Banner */}
                {isAnyTxPending && (
                    <div className="fixed top-32 right-10 z-50 bg-white text-black px-10 py-6 border-b-8 border-zinc-300 font-black uppercase tracking-tighter text-2xl flex items-center gap-6 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                        <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                        <span>{txStatus || 'Processing...'}</span>
                    </div>
                )}

                {/* Status Hero */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-10 pb-20 border-b-8 border-white">
                    <div className="text-center md:text-left space-y-4">
                        <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white uppercase leading-none">
                            DEAL <span className="text-brand-gradient">SUMMARY</span>
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <p className="font-code text-zinc-500 text-2xl">ID: {deal.deal_id}</p>
                            <button onClick={() => {
                                navigator.clipboard.writeText(deal.deal_id);
                                setTxStatus('ID COPIED');
                                setTimeout(() => setTxStatus(null), 2000);
                            }} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="px-12 py-8 bg-white text-black font-black text-5xl tracking-tighter uppercase italic border-b-[12px] border-zinc-400">
                        {statusConfig.label}
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <Card title="PARTICIPANTS">
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black ml-1">SELLER</label>
                                <div className="bg-black border-[4px] border-white/20 p-6 font-code text-xl text-white break-all relative group/addr">
                                    {deal.seller_address}
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(deal.seller_address);
                                            setTxStatus('ADDRESS COPIED');
                                            setTimeout(() => setTxStatus(null), 2000);
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
                            <div className="space-y-4">
                                <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black ml-1">BUYER</label>
                                <div className="bg-black border-[4px] border-white/20 p-6 font-code text-xl text-white break-all relative group/addr">
                                    {deal.buyer_address}
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(deal.buyer_address);
                                            setTxStatus('ADDRESS COPIED');
                                            setTimeout(() => setTxStatus(null), 2000);
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
                    </Card>

                    <Card title="ASSET INFO">
                        <div className="space-y-16">
                            <div className="space-y-4">
                                <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black ml-1">TOTAL VALUE</label>
                                <div className="flex items-baseline gap-6">
                                    <span className="text-8xl font-black tracking-tighter text-white">{deal.amount}</span>
                                    <span className="text-3xl font-black text-zinc-500 uppercase tracking-widest">{deal.token}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-10 pt-10 border-t-8 border-white/5">
                                <div className="space-y-3">
                                    <label className="text-sm text-zinc-500 uppercase tracking-[0.3em] font-black">REMAINING</label>
                                    <p className={`text-4xl font-black tracking-tighter ${isDeadlinePassed ? 'text-red-500' : 'text-white'}`}>
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

                <Card title="TERMS & NOTES">
                    <p className="text-2xl text-zinc-300 leading-relaxed font-bold tracking-tight">
                        {deal.description || "No specific terms provided."}
                    </p>
                </Card>

                <Card title="EXECUTION" className="p-16 relative overflow-visible" showCharacter={true}>
                    <div className="space-y-12">
                        {deal.status === 'draft' && (
                            <div className="space-y-12">
                                <p className="text-zinc-500 text-3xl leading-relaxed italic font-bold max-w-2xl">
                                    "Initialize the secure escrow contract on-chain to proceed."
                                </p>
                                {!address ? (
                                    <div className="p-16 border-8 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center gap-10">
                                        <p className="text-sm text-zinc-500 font-black uppercase tracking-[0.5em]">AUTHORIZATION REQUIRED</p>
                                        <ConnectButton />
                                    </div>
                                ) : isWrongNetwork ? (
                                    <button onClick={handleSwitchNetwork} className="w-full bg-red-600 text-white font-black py-10 rounded-none text-4xl uppercase tracking-tighter hover:bg-red-500 transition-all border-b-[16px] border-red-800 active:translate-y-2 active:border-b-[8px]">
                                        SWITCH TO BASE
                                    </button>
                                ) : isBuyer ? (
                                    <button onClick={handleCreateEscrow} disabled={isAnyTxPending} className="w-full bg-white text-black font-black py-10 rounded-none text-4xl uppercase tracking-tighter hover:bg-zinc-200 transition-all border-b-[16px] border-zinc-300 active:translate-y-2 active:border-b-[8px]">
                                        {isAnyTxPending ? 'INITIALIZING...' : 'DEPLOY ESCROW CONTRACT'}
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
                                        <button onClick={handleApproveUsdc} disabled={isAnyTxPending || !needsApproval} className={`py-8 px-10 border-4 font-black text-2xl uppercase tracking-widest transition-all ${!needsApproval ? 'border-zinc-800 text-zinc-600 bg-zinc-900 pointer-events-none' : 'border-white text-white hover:bg-white/10'}`}>
                                            {!needsApproval ? 'APPROVED' : '1. ALLOW USDC'}
                                        </button>
                                        <button onClick={handleFundEscrow} disabled={isAnyTxPending || needsApproval} className="py-8 px-10 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-black text-2xl uppercase tracking-widest transition-all border-b-[12px] border-zinc-300 active:translate-y-2 active:border-b-[6px]">
                                            {isFunding ? 'FUNDING...' : '2. DEPOSIT FUNDS'}
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
                                        <button onClick={handleReleaseFunds} disabled={isAnyTxPending} className="w-full bg-white text-black font-black py-10 rounded-none text-5xl uppercase tracking-tighter hover:bg-zinc-200 transition-all border-b-[16px] border-zinc-300 active:translate-y-2 active:border-b-[8px]">
                                            {isReleasing ? 'RELEASING...' : 'RELEASE TO SELLER'}
                                        </button>
                                        <button onClick={handleDispute} disabled={isAnyTxPending} className="w-full py-6 text-zinc-500 hover:text-white font-black uppercase tracking-[0.2em] text-lg transition-all underline decoration-4 underline-offset-8">
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
                                                onClick={() => handleTx(() => resolveDispute({
                                                    address: deal.escrow_address as `0x${string}`,
                                                    abi: escrowAbi,
                                                    functionName: 'resolve',
                                                    args: [false]
                                                }), 'Ruling for Buyer...')}
                                                className="py-6 border-4 border-white hover:bg-white hover:text-black font-black uppercase tracking-widest transition-all">
                                                WINNER: BUYER
                                            </button>
                                            <button
                                                onClick={() => handleTx(() => resolveDispute({
                                                    address: deal.escrow_address as `0x${string}`,
                                                    abi: escrowAbi,
                                                    functionName: 'resolve',
                                                    args: [true]
                                                }), 'Ruling for Seller...')}
                                                className="py-6 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest transition-all">
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
                    <Card title="PROTOCOL FEES">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-16">
                            <p className="text-zinc-500 text-2xl font-bold max-w-xl">Fully decentralized OTC trading. Only 0.1% commission when paying with TOWNS.</p>
                            <div className="flex items-center gap-8">
                                <div className="flex flex-col items-end">
                                    <span className="text-green-500 font-black text-xs tracking-tighter animate-pulse mb-2">ACTIVE SYSTEM</span>
                                    <div className="relative group/toggle flex items-center bg-zinc-900 border-2 border-zinc-800 p-1.5 rounded-full w-36 h-20 transition-all hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                        <div className="absolute right-2 w-16 h-16 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e] transition-transform" />
                                        <span className="ml-5 text-sm font-black text-green-500/80 tracking-widest">ON</span>
                                    </div>
                                </div>
                                <div className="px-12 py-8 border-4 border-white/10 text-white font-black uppercase tracking-widest text-4xl whitespace-nowrap transition-all duration-500 hover:border-green-500 hover:text-green-400 hover:bg-green-500/5 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] group">
                                    $ <span className="text-brand-gradient group-hover:from-green-400 group-hover:to-green-600 transition-all">TOWNS</span> 0.1%
                                </div>
                            </div>
                        </div>
                    </Card>

                    {deal.escrow_address && (
                        <div className="border-[8px] border-white p-12 bg-[#09090b] relative group/contract">
                            <div className="absolute top-0 right-10 -translate-y-1/2 bg-white text-black px-6 py-2 font-black uppercase text-sm tracking-widest">VERIFIED CONTRACT</div>
                            <div className="space-y-6">
                                <label className="text-sm text-zinc-500 font-black uppercase tracking-[0.4em]">ON-CHAIN PROTOCOL ADDRESS</label>
                                <div className="relative group/addr">
                                    <a href={`https://basescan.org/address/${deal.escrow_address}`} target="_blank" rel="noopener noreferrer" className="font-code text-3xl text-white hover:text-zinc-300 break-all block leading-tight underline decoration-8 underline-offset-10">
                                        {deal.escrow_address}
                                    </a>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(deal.escrow_address!);
                                            setTxStatus('CONTRACT COPIED');
                                            setTimeout(() => setTxStatus(null), 2000);
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
