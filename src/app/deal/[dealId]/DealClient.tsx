'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, keccak256, toHex, zeroAddress } from 'viem'
import { getDeal, updateDealStatus } from '@/lib/api'
import { FACTORY_ADDRESS, USDC_ADDRESS, factoryAbi, escrowAbi, erc20Abi, parseUsdcAmount } from '@/lib/contracts'
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

export default function DealClient({ dealId }: Props) {
    const { address } = useAccount()
    const [deal, setDeal] = useState<Deal | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [txStatus, setTxStatus] = useState<string | null>(null)
    const [isCheckingBlockchain, setIsCheckingBlockchain] = useState(false)

    // On-chain state (source of truth)
    const [onChainEscrow, setOnChainEscrow] = useState<`0x${string}` | null>(null)
    const [onChainStatus, setOnChainStatus] = useState<number | null>(null) // 0=Unfunded, 1=Funded, 2=Released, 3=Refunded, 4=Disputed

    // Contract write hooks
    const { writeContract: createEscrow, data: createHash, isPending: isCreating } = useWriteContract()
    const { writeContract: approveUsdc, data: approveHash, isPending: isApproving } = useWriteContract()
    const { writeContract: fundEscrow, data: fundHash, isPending: isFunding } = useWriteContract()
    const { writeContract: releaseEscrow, data: releaseHash, isPending: isReleasing } = useWriteContract()
    const { writeContract: refundEscrow, data: refundHash, isPending: isRefunding } = useWriteContract()
    const { writeContract: openDispute, data: disputeHash, isPending: isDisputing } = useWriteContract()

    // Transaction confirmations
    const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess, data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash })
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
    const { isLoading: isFundConfirming, isSuccess: isFundSuccess } = useWaitForTransactionReceipt({ hash: fundHash })
    const { isLoading: isReleaseConfirming, isSuccess: isReleaseSuccess } = useWaitForTransactionReceipt({ hash: releaseHash })
    const { isLoading: isRefundConfirming, isSuccess: isRefundSuccess } = useWaitForTransactionReceipt({ hash: refundHash })
    const { isLoading: isDisputeConfirming, isSuccess: isDisputeSuccess } = useWaitForTransactionReceipt({ hash: disputeHash })

    const isSeller = address?.toLowerCase() === deal?.seller_address?.toLowerCase()
    const isBuyer = address?.toLowerCase() === deal?.buyer_address?.toLowerCase()

    // Check USDC allowance for buyer
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: address && onChainEscrow ? [address, onChainEscrow] : undefined,
    })

    // Read buyer's escrows from blockchain
    const { data: buyerEscrows, refetch: refetchBuyerEscrows } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'getBuyerEscrows',
        args: deal?.buyer_address ? [deal.buyer_address as `0x${string}`] : undefined,
    })

    // Read seller's escrows from blockchain
    const { data: sellerEscrows, refetch: refetchSellerEscrows } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'getSellerEscrows',
        args: deal?.seller_address ? [deal.seller_address as `0x${string}`] : undefined,
    })

    // Read escrow contract status (if we have an escrow address)
    const { data: escrowInfo, refetch: refetchEscrowInfo } = useReadContract({
        address: onChainEscrow || undefined,
        abi: escrowAbi,
        functionName: 'getDealInfo',
        args: onChainEscrow ? [] : undefined,
    })

    // Load deal from API
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

    // Sync blockchain state
    const syncBlockchainState = async () => {
        if (!deal) return
        try {
            if (!onChainEscrow) {
                let escrows: `0x${string}`[] | undefined;
                if (deal.buyer_address) {
                    const result = await refetchBuyerEscrows()
                    escrows = result.data as `0x${string}`[] | undefined
                }
                if ((!escrows || escrows.length === 0) && deal.seller_address) {
                    const result = await refetchSellerEscrows()
                    escrows = result.data as `0x${string}`[] | undefined
                }
                if (escrows && escrows.length > 0) {
                    const sortedEscrows = [...escrows].reverse()
                    for (const escrowAddr of sortedEscrows) {
                        setOnChainEscrow(escrowAddr)
                        setDeal(prev => prev ? { ...prev, escrow_address: escrowAddr, status: 'created' as Deal['status'] } : prev)
                        try { await updateDealStatus(deal.deal_id, 'created', escrowAddr) } catch (e) { }
                        break;
                    }
                }
            }

            if (onChainEscrow) {
                const infoResult = await refetchEscrowInfo()
                const info = infoResult.data as any
                if (info) {
                    const chainStatus = info[7]
                    const statusMap: Record<number, string> = {
                        0: 'created', 1: 'funded', 2: 'released', 3: 'refunded', 4: 'disputed',
                    }
                    const newStatus = statusMap[chainStatus] || 'created'
                    if (deal.status !== newStatus) {
                        setDeal(prev => prev ? { ...prev, status: newStatus as Deal['status'] } : prev)
                        try { await updateDealStatus(deal.deal_id, newStatus, onChainEscrow) } catch (e) { }
                    }
                }
                await refetchAllowance()
            }
        } catch (err) { console.error(err) }
    }

    useEffect(() => { loadDeal(true) }, [dealId])
    useEffect(() => { if (deal) syncBlockchainState() }, [deal?.deal_id, deal?.buyer_address])
    useEffect(() => {
        if (!deal) return
        const interval = setInterval(() => syncBlockchainState(), 5000)
        return () => clearInterval(interval)
    }, [deal, onChainEscrow])

    // Handle Deal Creation Success
    useEffect(() => {
        if (isCreateSuccess && createReceipt && deal) {
            const handleSuccess = async () => {
                setTxStatus('Transaction confirmed! Verifying...')
                for (const log of createReceipt.logs) {
                    if (log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
                        const escrowAddressTopic = log.topics[1]
                        if (escrowAddressTopic) {
                            const escrowAddress = `0x${escrowAddressTopic.slice(-40)}` as `0x${string}`
                            setDeal(prev => prev ? { ...prev, status: 'created' as Deal['status'], escrow_address: escrowAddress } : prev)
                            setTxStatus('Success!')
                            try { await updateDealStatus(deal.deal_id, 'created', escrowAddress) } catch (e) { }
                            return
                        }
                    }
                }
                setOnChainEscrow(null)
                await syncBlockchainState()
            }
            handleSuccess()
        }
    }, [isCreateSuccess, createReceipt, deal])

    useEffect(() => {
        if (isFundSuccess || isReleaseSuccess || isRefundSuccess || isDisputeSuccess) {
            setTimeout(() => syncBlockchainState(), 2000)
        }
    }, [isFundSuccess, isReleaseSuccess, isRefundSuccess, isDisputeSuccess])

    // === ACTION HANDLERS ===

    const handleTx = async (fn: any, statusText: string) => {
        try {
            setTxStatus(statusText)
            fn()
        } catch (err) {
            console.error(err)
            setTxStatus('Transaction failed')
            setTimeout(() => setTxStatus(null), 3000)
        }
    }

    const handleCreateEscrow = async () => {
        if (!deal || !address) return
        if (deal.seller_address.toLowerCase() === deal.buyer_address.toLowerCase()) {
            setTxStatus('Error: Self-dealing')
            return
        }

        const amount = parseUsdcAmount(deal.amount)
        const memoHash = keccak256(toHex(deal.deal_id))

        handleTx(() => createEscrow({
            address: FACTORY_ADDRESS,
            abi: factoryAbi,
            functionName: 'createEscrow',
            args: [
                deal.seller_address as `0x${string}`,
                USDC_ADDRESS,
                amount,
                BigInt(deal.deadline),
                zeroAddress,
                memoHash,
            ],
        }), 'Creating escrow...')
    }

    const handleApproveUsdc = async () => {
        if (!deal?.escrow_address) return
        const amount = parseUsdcAmount(deal.amount)
        handleTx(() => approveUsdc({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [deal.escrow_address as `0x${string}`, amount],
        }), 'Approving USDC...')
    }

    const handleFundEscrow = async () => {
        if (!deal?.escrow_address) return
        handleTx(() => fundEscrow({
            address: deal.escrow_address as `0x${string}`,
            abi: escrowAbi,
            functionName: 'fund',
        }), 'Funding escrow...')
    }

    const handleReleaseFunds = async () => {
        if (!deal?.escrow_address) return
        handleTx(() => releaseEscrow({
            address: deal.escrow_address as `0x${string}`,
            abi: escrowAbi,
            functionName: 'release',
        }), 'Releasing funds...')
    }

    const handleRefund = async () => {
        if (!deal?.escrow_address) return
        handleTx(() => refundEscrow({
            address: deal.escrow_address as `0x${string}`,
            abi: escrowAbi,
            functionName: 'refundAfterDeadline',
        }), 'Processing refund...')
    }

    const handleDispute = async () => {
        if (!deal?.escrow_address) return
        handleTx(() => openDispute({
            address: deal.escrow_address as `0x${string}`,
            abi: escrowAbi,
            functionName: 'openDispute',
        }), 'Opening dispute...')
    }

    // === HELPER FUNCTIONS ===

    // Mouse tracking for grid/spotlight effect
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY })
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { color: string; bg: string; emoji: string }> = {
            draft: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', emoji: '⏳' },
            created: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', emoji: '📝' },
            funded: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', emoji: '✅' },
            released: { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', emoji: '💸' },
            refunded: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', emoji: '↩️' },
            disputed: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', emoji: '⚠️' },
            resolved: { color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30', emoji: '✔️' },
        }
        return configs[status] || { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30', emoji: '❓' }
    }

    const isAnyTxPending = isCreating || isApproving || isFunding || isReleasing || isRefunding ||
        isCreateConfirming || isApproveConfirming || isFundConfirming || isReleaseConfirming || isRefundConfirming

    const needsApproval = !!(deal?.escrow_address && allowance !== undefined &&
        allowance < parseUsdcAmount(deal.amount))

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-background bg-grid flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-secondary font-medium text-lg">Loading deal...</p>
                </div>
            </div>
        )
    }

    // Error State
    if (error || !deal) {
        return (
            <div className="min-h-screen bg-background bg-grid flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 text-center">
                    <div className="text-6xl mb-6 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">❌</div>
                    <p className="text-xl text-red-400 font-bold mb-2 opacity-0 animate-[slideUp_0.5s_ease-out_0.2s_forwards] tracking-tight">{error || 'Deal not found'}</p>
                    <p className="text-secondary mb-8 opacity-0 animate-[slideUp_0.5s_ease-out_0.3s_forwards]">The deal may have expired or doesn't exist.</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border-2 border-white/10 rounded-xl text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest text-sm opacity-0 animate-[fadeIn_0.5s_ease-out_0.5s_forwards]"
                    >
                        ← Back to home
                    </Link>
                </div>
            </div>
        )
    }

    const deadlineDate = new Date(deal.deadline * 1000)
    const statusConfig = getStatusConfig(deal.status)
    const isDeadlinePassed = Date.now() > deal.deadline * 1000

    return (
        <div className="min-h-screen bg-[#050505] relative overflow-hidden font-sans">
            {/* Grain Overlay */}
            <div className="bg-noise" />

            {/* Subtle Grid */}
            <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />

            {/* Header */}
            <header className="relative z-20 border-b border-[#27272a] bg-[#050505]">
                <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="font-bold text-lg tracking-tight text-white uppercase">
                            RONIN OTC
                        </span>
                    </Link>
                    <ConnectButton />
                </div>
            </header>

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 space-y-12 animate-[fadeIn_0.5s_ease-out]">

                {/* Transaction Status Banner */}
                {isAnyTxPending && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-[slideUp_0.3s_ease-out]">
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">{txStatus || 'Processing...'}</span>
                    </div>
                )}

                {/* Status Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-[#27272a]">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-white uppercase">
                            DEAL SUMMARY
                        </h1>
                        <div className="flex items-center gap-3">
                            <p className="font-code text-zinc-400 text-sm tracking-wide">
                                ID: {deal.deal_id}
                            </p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(deal.deal_id);
                                    setTxStatus('ID copied!');
                                    setTimeout(() => setTxStatus(null), 2000);
                                }}
                                className="p-1 text-zinc-500 hover:text-white transition-colors"
                                title="Copy ID"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-[#18181b] border border-[#27272a] rounded-full">
                        <span className="font-code text-xs font-bold text-white uppercase tracking-widest">
                            {deal.status}
                        </span>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Participants Card */}
                    <div className="bg-[#09090b] border-industrial rounded-xl p-8 space-y-8">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">
                            PARTICIPANTS
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1">SELLER</label>
                                <div className="bg-black border border-white/5 rounded-lg p-4 font-code text-sm text-zinc-300 break-all relative group/addr">
                                    {deal.seller_address}
                                    {isSeller && (
                                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-zinc-800 text-[10px] font-bold text-white rounded border border-zinc-700">YOU</span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1">BUYER</label>
                                <div className="bg-black border border-white/5 rounded-lg p-4 font-code text-sm text-zinc-300 break-all relative group/addr">
                                    {deal.buyer_address}
                                    {isBuyer && (
                                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-zinc-800 text-[10px] font-bold text-white rounded border border-zinc-700">YOU</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Asset Info Card */}
                    <div className="bg-[#09090b] border-industrial rounded-xl p-8 flex flex-col justify-between">
                        <div className="space-y-8">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">
                                ASSET INFO
                            </h3>
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1">TOTAL VALUE</label>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-6xl font-bold tracking-tighter text-white">
                                        {deal.amount}
                                    </span>
                                    <span className="text-xl font-bold text-zinc-500 uppercase">
                                        {deal.token}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-zinc-800/50">
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">REMAINING</label>
                                <p className={`text-lg font-bold tracking-tight ${isDeadlinePassed ? 'text-red-500' : 'text-white'}`}>
                                    <CountdownTimer deadline={deal.deadline} />
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">NETWORK</label>
                                <p className="text-lg font-bold tracking-tight text-white uppercase">BASE</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-[#09090b] border-industrial rounded-xl p-8">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">
                        TERMS & NOTES
                    </h3>
                    <p className="text-zinc-400 leading-relaxed">
                        {deal.description || "No specific terms provided."}
                    </p>
                </div>

                {/* Execution Section */}
                <div className="bg-[#09090b] border-industrial rounded-xl p-10 space-y-8">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                        EXECUTION
                    </h3>

                    {/* 1. DRAFT: Buyer needs to deploy the contract */}
                    {deal.status === 'draft' && (
                        <div className="space-y-8">
                            <p className="text-zinc-500 text-lg leading-relaxed italic">
                                Initialize the secure escrow contract on-chain to proceed.
                            </p>
                            {!address ? (
                                <div className="p-12 border border-dashed border-zinc-800 rounded-lg flex flex-col items-center gap-6">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">CONNECTION REQUIRED</p>
                                    <ConnectButton />
                                </div>
                            ) : isBuyer ? (
                                <button
                                    onClick={handleCreateEscrow}
                                    disabled={isAnyTxPending}
                                    className="w-full bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold py-5 rounded-lg text-lg uppercase tracking-tight transition-all"
                                >
                                    {isAnyTxPending ? 'INITIALIZING...' : 'DEPLOY ESCROW CONTRACT'}
                                </button>
                            ) : (
                                <div className="p-8 bg-zinc-900/10 border border-zinc-800 rounded-lg text-center">
                                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Awaiting buyer initialization...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. CREATED: Unfunded. Buyer needs to approve & deposit */}
                    {deal.status === 'created' && (
                        <div className="space-y-8">
                            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                                <p className="text-zinc-400 text-sm font-medium">
                                    Protocol ready. Deposit <span className="text-white font-bold">{deal.amount} {deal.token}</span> to secure the deal.
                                </p>
                            </div>
                            {isBuyer ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={handleApproveUsdc}
                                        disabled={isAnyTxPending || !needsApproval}
                                        className={`py-5 px-8 border font-bold text-base uppercase tracking-widest rounded-lg transition-all ${!needsApproval ? 'border-zinc-800 text-zinc-500 bg-zinc-900' : 'border-white text-white hover:bg-white/10'}`}
                                    >
                                        {!needsApproval ? 'ALLOWANCE OK' : '1. ALLOW USDC'}
                                    </button>
                                    <button
                                        onClick={handleFundEscrow}
                                        disabled={isAnyTxPending || needsApproval}
                                        className="py-5 px-8 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-bold text-base uppercase tracking-widest rounded-lg transition-all"
                                    >
                                        {isFunding ? 'FUNDING...' : '2. DEPOSIT FUNDS'}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-8 bg-zinc-900/10 border border-zinc-800 rounded-lg text-center">
                                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Waiting for buyer deposit...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. FUNDED: Buyer can release */}
                    {deal.status === 'funded' && (
                        <div className="space-y-8">
                            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
                                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">ASSETS SECURED IN PROTOCOL</p>
                            </div>
                            {isBuyer ? (
                                <div className="space-y-4">
                                    <button
                                        onClick={handleReleaseFunds}
                                        disabled={isAnyTxPending}
                                        className="w-full bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold py-6 rounded-lg text-xl uppercase tracking-tight transition-all"
                                    >
                                        {isReleasing ? 'RELEASING...' : 'RELEASE TO SELLER'}
                                    </button>
                                    <button
                                        onClick={handleDispute}
                                        disabled={isAnyTxPending}
                                        className="w-full py-4 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                                    >
                                        OPEN DISPUTE
                                    </button>
                                </div>
                            ) : isSeller ? (
                                <div className="p-8 bg-zinc-900/10 border border-zinc-800 rounded-lg text-center">
                                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Waiting for buyer release...</p>
                                </div>
                            ) : null}

                            {isDeadlinePassed && (
                                <button
                                    onClick={handleRefund}
                                    disabled={isAnyTxPending}
                                    className="w-full py-3 bg-red-950/20 border border-red-900 text-red-500 font-bold uppercase tracking-widest text-[10px] rounded hover:bg-red-950/40 transition-all"
                                >
                                    REFUND (DEADLINE EXPIRED)
                                </button>
                            )}
                        </div>
                    )}

                    {/* 4. FINAL STATES */}
                    {(deal.status === 'released' || deal.status === 'refunded' || deal.status === 'disputed') && (
                        <div className="text-center py-16 space-y-6">
                            <h4 className="text-3xl font-bold text-white uppercase tracking-tight">
                                {deal.status === 'released' ? 'DEAL COMPLETED' : deal.status === 'refunded' ? 'DEAL REFUNDED' : 'DEAL IN DISPUTE'}
                            </h4>
                            <p className="text-zinc-500 max-w-sm mx-auto text-sm">
                                {deal.status === 'released' ? 'Assets have been successfully transferred to the target address.' :
                                    deal.status === 'refunded' ? 'Funds have been returned to the originator.' :
                                        'Protocol arbiter is currently reviewing the transaction.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Fee Section */}
                <div className="max-w-4xl mx-auto space-y-6 pt-12">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">PROTOCOL FEES</h4>
                                <p className="text-zinc-500 text-sm">Transparent fee structure for secure OTC trading.</p>
                            </div>
                            <div className="flex items-center gap-2 p-1 bg-black border border-zinc-800 rounded-lg">
                                <div className="px-4 py-2 bg-zinc-800 rounded-md">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">0.5% Standard</span>
                                </div>
                                <div className="px-4 py-2 opacity-50">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">0.1% for $TOWNS Holders</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {deal.escrow_address && (
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">CONTRACT ADDRESS</span>
                                <a
                                    href={`https://basescan.org/address/${deal.escrow_address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-code text-xs text-zinc-400 px-4 py-2 bg-black border border-white/5 rounded-lg hover:border-white/20 transition-all break-all text-center"
                                >
                                    {deal.escrow_address}
                                </a>
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    )
}
