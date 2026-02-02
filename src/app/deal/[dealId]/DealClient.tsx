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

    // Transaction confirmations
    const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess, data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash })
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
    const { isLoading: isFundConfirming, isSuccess: isFundSuccess } = useWaitForTransactionReceipt({ hash: fundHash })
    const { isLoading: isReleaseConfirming, isSuccess: isReleaseSuccess } = useWaitForTransactionReceipt({ hash: releaseHash })
    const { isLoading: isRefundConfirming, isSuccess: isRefundSuccess } = useWaitForTransactionReceipt({ hash: refundHash })

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
                // If API has escrow address, use it
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

    // Sync blockchain state - the main function that keeps UI in sync with chain
    const syncBlockchainState = async () => {
        if (!deal) return

        console.log('🔄 Syncing blockchain state...')

        try {
            // Step 1: Check if escrow exists on-chain
            if (!onChainEscrow) {
                let escrows: `0x${string}`[] | undefined;

                // If buyer is viewing, check buyer list. If seller, check seller list.
                if (deal.buyer_address) {
                    const result = await refetchBuyerEscrows()
                    escrows = result.data as `0x${string}`[] | undefined
                }

                if ((!escrows || escrows.length === 0) && deal.seller_address) {
                    const result = await refetchSellerEscrows()
                    escrows = result.data as `0x${string}`[] | undefined
                }

                if (escrows && escrows.length > 0) {
                    // Start from the most recent
                    const sortedEscrows = [...escrows].reverse()

                    for (const escrowAddr of sortedEscrows) {
                        console.log('✅ Found escrow on-chain matching role:', escrowAddr)
                        setOnChainEscrow(escrowAddr)

                        // Update local deal state
                        setDeal(prev => prev ? { ...prev, escrow_address: escrowAddr, status: 'created' as Deal['status'] } : prev)

                        // Try to update API in background
                        try {
                            await updateDealStatus(deal.deal_id, 'created', escrowAddr)
                        } catch (e) {
                            console.warn('API sync failed:', e)
                        }
                        break;
                    }
                }
            }

            // Step 2: If we have escrow, read its on-chain status
            if (onChainEscrow) {
                const infoResult = await refetchEscrowInfo()
                const info = infoResult.data as readonly [string, string, string, bigint, bigint, string, string, number, bigint] | undefined

                if (info) {
                    const chainStatus = info[7] // _status field
                    console.log('📊 On-chain status:', chainStatus)
                    setOnChainStatus(chainStatus)

                    // Map on-chain status to deal status
                    const statusMap: Record<number, string> = {
                        0: 'created',   // Unfunded
                        1: 'funded',    // Funded
                        2: 'released',  // Released
                        3: 'refunded',  // Refunded
                        4: 'disputed',  // Disputed
                    }

                    const newStatus = statusMap[chainStatus] || 'created'
                    if (deal.status !== newStatus) {
                        console.log(`🔄 Updating status: ${deal.status} → ${newStatus}`)
                        setDeal(prev => prev ? { ...prev, status: newStatus as Deal['status'] } : prev)

                        // Try to update API
                        try {
                            await updateDealStatus(deal.deal_id, newStatus, onChainEscrow)
                        } catch (e) {
                            console.warn('API sync failed:', e)
                        }
                    }
                }

                // Also refresh allowance
                await refetchAllowance()
            }
        } catch (err) {
            console.error('Blockchain sync error:', err)
        }
    }

    // Initial load
    useEffect(() => {
        loadDeal(true)
    }, [dealId])

    // Sync blockchain state when deal loads or escrow changes
    useEffect(() => {
        if (deal) {
            syncBlockchainState()
        }
    }, [deal?.deal_id, deal?.buyer_address])

    // Periodic blockchain sync (every 5 seconds)
    useEffect(() => {
        if (!deal) return

        const interval = setInterval(() => {
            syncBlockchainState()
        }, 5000)

        return () => clearInterval(interval)
    }, [deal, onChainEscrow])

    // Handle Deal Creation Success - use blockchain verification
    useEffect(() => {
        if (isCreateSuccess && createReceipt && deal) {
            console.log('=== CREATE SUCCESS ===')
            console.log('Receipt:', createReceipt)

            const handleSuccess = async () => {
                setTxStatus('Transaction confirmed! Verifying on blockchain...')

                // First try to extract from receipt logs
                for (const log of createReceipt.logs) {
                    if (log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
                        const escrowAddressTopic = log.topics[1]
                        if (escrowAddressTopic) {
                            const escrowAddress = `0x${escrowAddressTopic.slice(-40)}` as `0x${string}`
                            console.log('Extracted escrow address:', escrowAddress)

                            // Update local state immediately
                            setDeal(prev => prev ? { ...prev, status: 'created' as Deal['status'], escrow_address: escrowAddress } : prev)
                            setTxStatus('Escrow created successfully!')

                            // Try API update in background
                            try {
                                await updateDealStatus(deal.deal_id, 'created', escrowAddress)
                            } catch (apiErr) {
                                console.warn('API update failed, but escrow exists on blockchain:', apiErr)
                            }
                            return
                        }
                    }
                }

                // Fallback: trigger blockchain sync
                console.log('Could not parse logs, triggering sync...')
                setOnChainEscrow(null) // Force re-check
                await syncBlockchainState()
            }
            handleSuccess()
        }
    }, [isCreateSuccess, createReceipt, deal])


    // Reload deal after other successful transactions
    useEffect(() => {
        if (isFundSuccess || isReleaseSuccess || isRefundSuccess) {
            setTimeout(() => syncBlockchainState(), 2000)
        }
    }, [isFundSuccess, isReleaseSuccess, isRefundSuccess])

    // === ACTION HANDLERS ===

    const handleCreateEscrow = async () => {
        if (!deal || !address) return

        // Prevent self-dealing deployment
        if (deal.seller_address.toLowerCase() === deal.buyer_address.toLowerCase()) {
            setTxStatus('Error: Seller cannot be Buyer')
            alert('Cannot deploy: Seller and Buyer addresses are the same.')
            return
        }

        setTxStatus('Creating escrow on-chain...')

        const amount = parseUsdcAmount(deal.amount)
        const memoHash = keccak256(toHex(deal.deal_id))

        try {
            createEscrow({
                address: FACTORY_ADDRESS,
                abi: factoryAbi,
                functionName: 'createEscrow',
                args: [
                    deal.seller_address as `0x${string}`,   // seller (arg 0)
                    USDC_ADDRESS,                           // token (USDC)
                    amount,                                 // amount in USDC (6 decimals)
                    BigInt(deal.deadline),                 // deadline timestamp
                    zeroAddress,                           // arbiter (none for now)
                    memoHash,                              // memo hash
                ],
            })
        } catch (err) {
            console.error('Create escrow error:', err)
            setTxStatus('Failed to create escrow')
        }
    }

    const handleApproveUsdc = async () => {
        if (!deal?.escrow_address) return
        setTxStatus('Approving USDC spend...')

        const amount = parseUsdcAmount(deal.amount)

        try {
            approveUsdc({
                address: USDC_ADDRESS,
                abi: erc20Abi,
                functionName: 'approve',
                args: [deal.escrow_address as `0x${string}`, amount],
            })
        } catch (err) {
            console.error('Approve error:', err)
            setTxStatus('Failed to approve USDC')
        }
    }

    const handleFundEscrow = async () => {
        if (!deal?.escrow_address) return
        setTxStatus('Funding escrow...')

        try {
            fundEscrow({
                address: deal.escrow_address as `0x${string}`,
                abi: escrowAbi,
                functionName: 'fund',
            })
        } catch (err) {
            console.error('Fund error:', err)
            setTxStatus('Failed to fund escrow')
        }
    }

    const handleReleaseFunds = async () => {
        if (!deal?.escrow_address) return
        setTxStatus('Releasing funds to seller...')

        try {
            releaseEscrow({
                address: deal.escrow_address as `0x${string}`,
                abi: escrowAbi,
                functionName: 'release',
            })
        } catch (err) {
            console.error('Release error:', err)
            setTxStatus('Failed to release funds')
        }
    }

    const handleRefund = async () => {
        if (!deal?.escrow_address) return
        setTxStatus('Processing refund...')

        try {
            refundEscrow({
                address: deal.escrow_address as `0x${string}`,
                abi: escrowAbi,
                functionName: 'refundAfterDeadline',
            })
        } catch (err) {
            console.error('Refund error:', err)
            setTxStatus('Failed to refund')
        }
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

            <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-10 animate-[fadeIn_0.8s_ease-out]">

                {/* Transaction Status Banner */}
                {isAnyTxPending && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#A855F7] text-white px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.4)] flex items-center gap-4 animate-[slideUp_0.3s_ease-out]">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="font-black uppercase tracking-widest text-xs">{txStatus || 'Processing transaction...'}</span>
                    </div>
                )}

                {/* Status Header Card - Extra Thick Glassmorphism */}
                <div className="relative group animate-[slideUp_0.6s_ease-out]">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#A855F7]/30 to-blue-600/30 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
                    <div className="relative bg-[#050505]/90 backdrop-blur-3xl border-2 border-white/15 rounded-3xl p-10 overflow-hidden">
                        <div className="flex items-center justify-between flex-wrap gap-8">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none">
                                    Deal <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#A855F7]/50">Summary</span>
                                </h1>
                                <div className="flex items-center gap-3">
                                    <p className="font-mono text-xs text-secondary tracking-widest break-all bg-white/5 py-1.5 px-3 rounded-lg border border-white/5">{deal.deal_id}</p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(deal.deal_id);
                                            setTxStatus('ID copied!');
                                            setTimeout(() => setTxStatus(null), 2000);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-secondary hover:text-white border border-transparent hover:border-white/10"
                                        title="Copy ID"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className={`flex items-center gap-4 px-8 py-5 rounded-2xl border-2 shadow-2xl transition-all duration-500 ${statusConfig.bg}`}>
                                <span className="text-4xl filter drop-shadow-md">{statusConfig.emoji}</span>
                                <span className={`font-black text-xl uppercase tracking-tighter ${statusConfig.color}`}>
                                    {deal.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Participants Card */}
                    <div className="bg-[#050505]/80 backdrop-blur-2xl border-2 border-white/10 rounded-3xl p-8 hover:border-[#A855F7]/40 transition-all duration-500 group animate-[slideUp_0.8s_ease-out]">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <span className="p-2 bg-[#A855F7]/10 rounded-xl">👥</span> Participants
                        </h3>
                        <div className="space-y-6">
                            <div className="relative p-6 bg-white/5 rounded-2xl border-2 border-white/5 group-hover:bg-white/[0.07] transition-all">
                                <label className="text-[10px] text-[#A855F7] uppercase tracking-[0.2em] mb-3 block font-black">Seller</label>
                                <p className="font-mono text-sm text-white break-all leading-relaxed">{deal.seller_address}</p>
                                {isSeller && (
                                    <span className="absolute top-6 right-6 text-[10px] px-3 py-1 bg-[#A855F7]/30 text-white rounded-full font-black uppercase tracking-widest">
                                        You
                                    </span>
                                )}
                            </div>
                            <div className="relative p-6 bg-white/5 rounded-2xl border-2 border-white/5 group-hover:bg-white/[0.07] transition-all">
                                <label className="text-[10px] text-blue-400 uppercase tracking-[0.2em] mb-3 block font-black">Buyer</label>
                                <p className="font-mono text-sm text-white break-all leading-relaxed">{deal.buyer_address}</p>
                                {isBuyer && (
                                    <span className="absolute top-6 right-6 text-[10px] px-3 py-1 bg-blue-500/30 text-white rounded-full font-black uppercase tracking-widest">
                                        You
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Deal Details Card */}
                    <div className="bg-[#050505]/80 backdrop-blur-2xl border-2 border-white/10 rounded-3xl p-8 hover:border-blue-500/40 transition-all duration-500 group animate-[slideUp_1s_ease-out]">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <span className="p-2 bg-blue-500/10 rounded-xl">💰</span> Asset Info
                        </h3>
                        <div className="space-y-6">
                            <div className="p-8 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border-2 border-white/5 group-hover:border-white/10 transition-all">
                                <label className="text-[10px] text-secondary uppercase tracking-[0.2em] mb-4 block font-black">Total Value</label>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-6xl font-black tracking-tighter text-white">
                                        {deal.amount}
                                    </span>
                                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] to-blue-500 uppercase">
                                        {deal.token}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-white/5 rounded-2xl border-2 border-white/5">
                                    <label className="text-[10px] text-secondary uppercase tracking-[0.2em] mb-3 block font-black">Deadline</label>
                                    <p className={`text-xl font-black tracking-tighter ${isDeadlinePassed ? 'text-red-500' : 'text-white'}`}>
                                        {deadlineDate.toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                    </p>
                                    <p className="text-[10px] font-mono text-secondary mt-1 uppercase">{deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-2xl border-2 border-white/5">
                                    <label className="text-[10px] text-secondary uppercase tracking-[0.2em] mb-3 block font-black">Blockchain</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                        <p className="text-xl font-black tracking-tighter text-white uppercase">Base</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description - Full Width Glass */}
                <div className="bg-[#050505]/80 backdrop-blur-2xl border-2 border-white/10 rounded-3xl p-10 animate-[fadeIn_1.2s_ease-out]">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                        <span className="p-2 bg-yellow-500/10 rounded-xl">📋</span> Terms & Notes
                    </h3>
                    <p className="text-xl text-secondary leading-relaxed font-medium tracking-tight">
                        {deal.description || "No specific terms provided for this deal."}
                    </p>
                </div>

                {/* Actions - The Prime Section */}
                <div className="relative group animate-[slideUp_1.4s_ease-out]">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#A855F7]/20 to-blue-600/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-10 transition duration-700" />
                    <div className="relative bg-[#050505]/95 backdrop-blur-3xl border-2 border-white/20 rounded-[2rem] p-10 shadow-3xl">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <span className="p-2 bg-green-500/10 rounded-xl">⚡</span> Execution
                        </h3>

                        {/* DRAFT: Buyer creates escrow on-chain */}
                        {deal.status === 'draft' && (
                            <div className="space-y-8">
                                <div className="p-6 bg-yellow-500/5 border-2 border-yellow-500/20 rounded-2xl flex items-center gap-6">
                                    <span className="text-3xl">⚠️</span>
                                    <p className="text-yellow-300 text-sm font-black uppercase tracking-tight">
                                        Action Required: The BUYER must initialize the trustless contract on-chain to secure the deal.
                                    </p>
                                </div>

                                {!address && (
                                    <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                                        <p className="text-secondary font-black uppercase tracking-[0.25em] text-xs mb-8">Authorizing Required</p>
                                        <div className="inline-block transform hover:scale-105 transition-transform">
                                            <ConnectButton />
                                        </div>
                                    </div>
                                )}

                                {address && isBuyer && (
                                    <div className="space-y-4">
                                        <button
                                            onClick={handleCreateEscrow}
                                            disabled={isAnyTxPending || isCheckingBlockchain}
                                            className="w-full py-6 px-10 bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-black text-xl uppercase tracking-[0.15em] rounded-2xl transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] flex items-center justify-center gap-4"
                                        >
                                            {isCreating || isCheckingBlockchain ? (
                                                <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                                            ) : "🚀 Deploy Trustless Contract"}
                                        </button>
                                    </div>
                                )}

                                {address && isSeller && !isBuyer && (
                                    <div className="p-8 bg-blue-500/5 border-2 border-blue-500/10 rounded-2xl text-center">
                                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
                                        <p className="text-blue-300 font-black uppercase tracking-widest text-xs">
                                            Awaiting Buyer to initialize contract...
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CREATED: Buyer approves + deposits */}
                        {deal.status === 'created' && deal.escrow_address && (
                            <div className="space-y-8">
                                <div className="p-6 bg-blue-500/5 border-2 border-blue-500/20 rounded-2xl">
                                    <p className="text-blue-300 text-sm font-black uppercase tracking-tight">
                                        Contract ready. Buyer must now fund the escrow with <span className="text-white">{deal.amount} USDC</span>.
                                    </p>
                                </div>

                                {address && isBuyer && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <button
                                            onClick={handleApproveUsdc}
                                            disabled={isAnyTxPending || !needsApproval}
                                            className="py-6 px-8 border-2 border-white/20 text-white font-black text-lg uppercase tracking-widest rounded-2xl hover:bg-white/10 disabled:opacity-50 transition-all flex items-center justify-center gap-4"
                                        >
                                            {isApproving ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : !needsApproval ? "✅ USDC READY" : "🔓 ALLOW $USDC"}
                                        </button>
                                        <button
                                            onClick={handleFundEscrow}
                                            disabled={isAnyTxPending || needsApproval}
                                            className="py-6 px-8 bg-gradient-to-r from-[#A855F7] to-blue-600 hover:from-[#A855F7]/90 hover:to-blue-600/90 disabled:opacity-50 text-white font-black text-lg uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_40px_rgba(168,85,247,0.2)] flex items-center justify-center gap-4"
                                        >
                                            {isFunding ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : "💰 DEPOSIT FUNDS"}
                                        </button>
                                    </div>
                                )}

                                {address && isSeller && !isBuyer && (
                                    <div className="text-center py-10 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-2xl">
                                        <p className="text-secondary font-black uppercase tracking-widest text-xs">Waiting for Buyer Deposit...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FUNDED: Buyer releases */}
                        {deal.status === 'funded' && deal.escrow_address && (
                            <div className="space-y-8 text-center py-6">
                                <div className="p-8 bg-green-500/5 border-2 border-green-500/20 rounded-2xl mb-8">
                                    <p className="text-green-300 text-sm font-black uppercase tracking-widest">🛡️ FUNDS SECURED IN ESCROW</p>
                                </div>

                                {address && isBuyer && (
                                    <button
                                        onClick={handleReleaseFunds}
                                        disabled={isAnyTxPending}
                                        className="w-full max-w-xl mx-auto py-8 px-12 bg-white text-black font-black text-2xl uppercase tracking-[0.2em] rounded-[2rem] hover:bg-gray-100 transition-all shadow-[0_0_80px_rgba(255,255,255,0.15)] flex items-center justify-center gap-6"
                                    >
                                        {isReleasing ? <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /> : "💸 RELEASE TO SELLER"}
                                    </button>
                                )}

                                {isDeadlinePassed && address && (isBuyer || isSeller) && (
                                    <button
                                        onClick={handleRefund}
                                        disabled={isAnyTxPending}
                                        className="mt-10 px-10 py-4 border-2 border-red-500/20 text-red-500 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-red-500/5 transition-all"
                                    >
                                        {isRefunding ? "Processing Refund..." : "↩️ REFUND (DEADLINE PASSED)"}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* COMPLETED */}
                        {(deal.status === 'released' || deal.status === 'refunded') && (
                            <div className="text-center py-16 bg-gradient-to-br from-[#A855F7]/10 to-blue-500/10 border-2 border-white/10 rounded-3xl animate-[fadeIn_1s_ease-out]">
                                <div className="text-8xl mb-8 animate-bounce">💎</div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
                                    {deal.status === 'released' ? 'Deal Finalized' : 'Deal Refunded'}
                                </h1>
                                <p className="text-secondary font-medium tracking-wide">The protocol has completed all asset movements.</p>
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
