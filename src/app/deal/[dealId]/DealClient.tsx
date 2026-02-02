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
        <div
            className="min-h-screen bg-background bg-grid relative overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Spotlight Effect */}
            <div
                className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(168, 85, 247, 0.05), transparent 60%)`
                }}
            />

            {/* Header */}
            <header className="relative z-20 border-b-2 border-white/10 bg-[#050505]/80 backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <span className="font-black text-2xl tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2E8F0] to-[#A855F7]">
                            RONIN OTC
                        </span>
                    </Link>
                    <ConnectButton aria-label="Connect Wallet" />
                </div>
            </header>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-8 animate-[fadeIn_0.8s_ease-out]">

                {/* Transaction Status Banner */}
                {isAnyTxPending && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#A855F7] text-white px-8 py-3 rounded-lg shadow-[0_0_40px_rgba(168,85,247,0.4)] flex items-center gap-4 animate-[slideUp_0.3s_ease-out]">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="font-black uppercase tracking-widest text-xs">{txStatus || 'Processing...'}</span>
                    </div>
                )}

                {/* Status Header Card - Squared & Shimmer Border */}
                <div className="relative group animate-[slideUp_0.6s_ease-out]">
                    <div className="absolute -inset-[2px] rounded-xl border-glow blur-[2px] opacity-40 group-hover:opacity-80 transition-opacity duration-700" />
                    <div className="relative bg-[#050505] rounded-[10px] p-8 overflow-hidden border border-white/10">
                        <div className="flex items-center justify-between flex-wrap gap-8">
                            <div className="flex flex-col gap-3">
                                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase leading-none">
                                    DEAL SUMMARY
                                </h1>
                                <div className="flex items-center gap-3">
                                    <p className="font-mono text-xl text-shimmer font-bold tracking-tight break-all">
                                        {deal.deal_id}
                                    </p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(deal.deal_id);
                                            setTxStatus('ID copied!');
                                            setTimeout(() => setTxStatus(null), 2000);
                                        }}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition-all text-secondary hover:text-white border border-white/10"
                                        title="Copy ID"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className={`flex items-center gap-4 px-10 py-5 rounded-lg border-2 shadow-2xl transition-all duration-500 ${statusConfig.bg}`}>
                                <span className="text-3xl">{statusConfig.emoji}</span>
                                <span className={`font-black text-2xl uppercase tracking-tighter ${statusConfig.color}`}>
                                    {deal.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Participants Card */}
                    <div className="relative group animate-[slideUp_0.8s_ease-out]">
                        <div className="absolute -inset-[2px] rounded-xl border-glow blur-sm opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                        <div className="relative bg-[#050505] rounded-[10px] p-6 border border-white/10 h-full">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
                                PARTICIPANTS
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-purple-400 uppercase tracking-[0.3em] font-black opacity-70 ml-1">SELLER</label>
                                    <div className="relative p-5 bg-white/[0.03] rounded-lg border border-white/5 flex items-center justify-between gap-4">
                                        <p className="font-mono text-lg text-shimmer font-bold break-all leading-none">{deal.seller_address}</p>
                                        {isSeller && (
                                            <span className="text-[9px] px-2 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 font-black uppercase tracking-widest whitespace-nowrap">YOU</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-blue-400 uppercase tracking-[0.3em] font-black opacity-70 ml-1">BUYER</label>
                                    <div className="relative p-5 bg-white/[0.03] rounded-lg border border-white/5 flex items-center justify-between gap-4">
                                        <p className="font-mono text-lg text-shimmer font-bold break-all leading-none">{deal.buyer_address}</p>
                                        {isBuyer && (
                                            <span className="text-[9px] px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-black uppercase tracking-widest whitespace-nowrap">YOU</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deal Details Card */}
                    <div className="relative group animate-[slideUp_1s_ease-out]">
                        <div className="absolute -inset-[2px] rounded-xl border-glow blur-sm opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                        <div className="relative bg-[#050505] rounded-[10px] p-6 border border-white/10 h-full">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
                                ASSET INFO
                            </h3>
                            <div className="space-y-6">
                                <div className="p-6 bg-white/[0.03] rounded-lg border border-white/5">
                                    <label className="text-[10px] text-secondary uppercase tracking-[0.3em] mb-3 block font-black opacity-70">TOTAL VALUE</label>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-5xl font-black tracking-tighter text-shimmer">
                                            {deal.amount}
                                        </span>
                                        <span className="text-xl font-black text-white/40 uppercase tracking-widest">
                                            {deal.token}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/[0.02] rounded-lg border border-white/5">
                                        <label className="text-[10px] text-secondary uppercase tracking-[0.3em] mb-2 block font-black opacity-70">DEADLINE</label>
                                        <p className={`text-lg font-black tracking-tighter ${isDeadlinePassed ? 'text-red-500' : 'text-white'}`}>
                                            {deadlineDate.toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white/[0.02] rounded-lg border border-white/5">
                                        <label className="text-[10px] text-secondary uppercase tracking-[0.3em] mb-2 block font-black opacity-70">NETWORK</label>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            <p className="text-lg font-black tracking-tighter text-white uppercase leading-none">BASE</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description - Full Width Glass */}
                <div className="relative group animate-[fadeIn_1.2s_ease-out]">
                    <div className="absolute -inset-[1px] rounded-xl border-glow opacity-10" />
                    <div className="relative bg-[#050505] rounded-[10px] p-8 border border-white/10">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4 opacity-40">
                            TERMS & NOTES
                        </h3>
                        <p className="text-lg text-secondary leading-relaxed font-medium tracking-tight">
                            {deal.description || "No specific terms provided."}
                        </p>
                    </div>
                </div>

                {/* Actions - The Prime Section */}
                <div className="relative group animate-[slideUp_1.4s_ease-out]">
                    <div className="absolute -inset-[2px] rounded-2xl border-glow blur-sm opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                    <div className="relative bg-[#050505] rounded-xl p-10 border border-white/20">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
                            EXECUTION
                        </h3>

                        {/* 1. DRAFT: Buyer needs to deploy the contract */}
                        {deal.status === 'draft' && (
                            <div className="space-y-8">
                                <p className="text-secondary text-lg font-medium leading-relaxed italic opacity-80 max-w-2xl">
                                    "Initialize the secure escrow contract on-chain to proceed with the transaction."
                                </p>
                                {!address ? (
                                    <div className="p-8 border-2 border-dashed border-white/10 rounded-lg bg-white/[0.02] flex flex-col items-center gap-6">
                                        <p className="text-[10px] text-secondary font-black uppercase tracking-[0.3em]">AUTHORIZATION REQUIRED</p>
                                        <ConnectButton />
                                    </div>
                                ) : isBuyer ? (
                                    <button
                                        onClick={handleCreateEscrow}
                                        disabled={isAnyTxPending}
                                        className="w-full bg-[#A855F7] hover:bg-[#9333ea] disabled:opacity-50 text-white font-black py-5 rounded-lg text-xl uppercase tracking-tighter shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all border-2 border-white/20"
                                    >
                                        {isAnyTxPending ? 'INITIALIZING...' : 'DEPLOY ESCROW CONTRACT'}
                                    </button>
                                ) : (
                                    <div className="p-8 bg-white/[0.02] border border-white/10 rounded-lg text-center">
                                        <p className="text-secondary font-black uppercase tracking-widest text-xs">Awaiting buyer to initialize contract...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. CREATED: Unfunded. Buyer needs to approve & deposit */}
                        {deal.status === 'created' && (
                            <div className="space-y-8">
                                <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <p className="text-blue-300 text-sm font-black uppercase tracking-tight">
                                        Protocol ready. Please authorize and deposit <span className="text-white">{deal.amount} {deal.token}</span>.
                                    </p>
                                </div>
                                {isBuyer ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={handleApproveUsdc}
                                            disabled={isAnyTxPending || !needsApproval}
                                            className={`py-5 px-8 border-2 font-black text-lg uppercase tracking-widest rounded-lg transition-all ${!needsApproval ? 'border-green-500/50 text-green-500 bg-green-500/5' : 'border-white/20 text-white hover:bg-white/5'}`}
                                        >
                                            {!needsApproval ? '✅ ALLOWED' : '1. ALLOW USDC'}
                                        </button>
                                        <button
                                            onClick={handleFundEscrow}
                                            disabled={isAnyTxPending || needsApproval}
                                            className="py-5 px-8 bg-white text-black hover:bg-gray-200 disabled:opacity-50 font-black text-lg uppercase tracking-widest rounded-lg transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                                        >
                                            {isFunding ? 'FUNDING...' : '2. DEPOSIT FUNDS'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-white/[0.02] border border-white/10 rounded-lg text-center">
                                        <p className="text-secondary font-black uppercase tracking-widest text-xs">Waiting for buyer to deposit funds...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. FUNDED: Buyer can release */}
                        {deal.status === 'funded' && (
                            <div className="space-y-8">
                                <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-lg text-center">
                                    <p className="text-green-300 text-sm font-black uppercase tracking-widest">🛡️ ASSETS SECURED IN PROTOCOL</p>
                                </div>
                                {isBuyer ? (
                                    <div className="space-y-4">
                                        <button
                                            onClick={handleReleaseFunds}
                                            disabled={isAnyTxPending}
                                            className="w-full bg-[#A855F7] hover:bg-[#9333ea] disabled:opacity-50 text-white font-black py-6 rounded-lg text-2xl uppercase tracking-tighter shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all border-2 border-white/20"
                                        >
                                            {isReleasing ? 'RELEASING...' : 'RELEASE TO SELLER'}
                                        </button>
                                        <button
                                            onClick={() => handleTx(refundEscrow, 'Opening dispute...')}
                                            disabled={isAnyTxPending}
                                            className="w-full py-4 text-orange-400 font-black uppercase tracking-widest text-xs hover:text-orange-300 transition-colors"
                                        >
                                            INITIATE DISPUTE
                                        </button>
                                    </div>
                                ) : isSeller ? (
                                    <div className="p-8 bg-white/[0.02] border border-white/10 rounded-lg text-center">
                                        <p className="text-secondary font-black uppercase tracking-widest text-xs">Waiting for buyer to release funds...</p>
                                    </div>
                                ) : null}

                                {isDeadlinePassed && (
                                    <button
                                        onClick={handleRefund}
                                        disabled={isAnyTxPending}
                                        className="w-full py-3 bg-red-900/10 border border-red-500/30 text-red-400 font-black uppercase tracking-widest text-[10px] rounded hover:bg-red-900/20 transition-all"
                                    >
                                        REFUND (DEADLINE EXPIRED)
                                    </button>
                                )}
                            </div>
                        )}

                        {/* 4. FINAL STATES */}
                        {(deal.status === 'released' || deal.status === 'refunded' || deal.status === 'disputed') && (
                            <div className="text-center py-12 space-y-4">
                                <div className="text-6xl mb-4">
                                    {deal.status === 'released' ? '💎' : deal.status === 'refunded' ? '↩️' : '⚖️'}
                                </div>
                                <h4 className="text-3xl font-black text-white uppercase tracking-tighter">
                                    {deal.status === 'released' ? 'DEAL COMPLETED' : deal.status === 'refunded' ? 'DEAL REFUNDED' : 'DEAL IN DISPUTE'}
                                </h4>
                                <p className="text-secondary font-medium max-w-md mx-auto">
                                    {deal.status === 'released' ? 'Assets have been successfully transferred to the seller.' :
                                        deal.status === 'refunded' ? 'Funds have been returned to the buyer.' :
                                            'The arbiter is currently reviewing this transaction.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Section - Glass Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fadeIn_1.6s_ease-out]">
                    <div className="bg-[#050505]/60 backdrop-blur-xl border-2 border-white/5 rounded-2xl p-6 flex justify-between items-center group">
                        <span className="text-xs font-black uppercase tracking-widest text-secondary group-hover:text-white transition-colors">Protocol Fee</span>
                        <span className="text-xl font-black text-white">0.5%</span>
                    </div>
                    {deal.escrow_address && (
                        <a
                            href={`https://basescan.org/address/${deal.escrow_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#050505]/60 backdrop-blur-xl border-2 border-white/5 rounded-2xl p-6 flex justify-between items-center group hover:border-[#A855F7]/30 transition-all"
                        >
                            <span className="text-xs font-black uppercase tracking-widest text-secondary group-hover:text-[#A855F7] transition-colors">Smart Contract</span>
                            <span className="font-mono text-xs text-white bg-white/5 py-2 px-4 rounded-lg group-hover:bg-[#A855F7]/10">
                                {deal.escrow_address.slice(0, 8)}...{deal.escrow_address.slice(-8)}
                                <span className="ml-2 opacity-50">↗</span>
                            </span>
                        </a>
                    )}
                </div>

            </main>

            {/* Simulated Grid Cell Highlights */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-20">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-white/5 animate-pulse"
                        style={{
                            width: '40px',
                            height: '40px',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDuration: `${3 + Math.random() * 4}s`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
