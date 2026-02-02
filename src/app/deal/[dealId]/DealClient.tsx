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
                    <div className="text-6xl mb-6">❌</div>
                    <p className="text-xl text-red-400 font-bold mb-2">{error || 'Deal not found'}</p>
                    <p className="text-secondary mb-8">The deal may have expired or doesn't exist.</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all font-medium"
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
        <div className="min-h-screen bg-background bg-grid relative overflow-hidden">
            <div className="fixed inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-blue-900/5 pointer-events-none" />

            {/* Header */}
            <header className="relative z-20 border-b border-white/10 bg-background/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">
                            RONIN OTC
                        </span>
                    </Link>
                    <ConnectButton />
                </div>
            </header>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-8">

                {/* Transaction Status Banner */}
                {isAnyTxPending && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-purple-600/90 backdrop-blur-xl text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="font-medium">{txStatus || 'Processing transaction...'}</span>
                    </div>
                )}

                {/* Status Header Card */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                        <div className="flex items-center justify-between flex-wrap gap-6">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-white mb-2">Deal Summary</h1>
                                <p className="font-mono text-sm text-secondary break-all">{deal.deal_id}</p>
                            </div>
                            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${statusConfig.bg}`}>
                                <span className="text-2xl">{statusConfig.emoji}</span>
                                <span className={`font-bold uppercase tracking-wide ${statusConfig.color}`}>
                                    {deal.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Participants Card */}
                    <div className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-purple-400">👥</span> Participants
                        </h3>
                        <div className="space-y-5">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <label className="text-xs text-purple-400 uppercase tracking-wider mb-2 block font-bold">Seller</label>
                                <p className="font-mono text-sm text-white break-all">{deal.seller_address}</p>
                                {isSeller && (
                                    <span className="inline-block mt-2 text-xs px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full font-medium">
                                        You
                                    </span>
                                )}
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <label className="text-xs text-blue-400 uppercase tracking-wider mb-2 block font-bold">Buyer</label>
                                <p className="font-mono text-sm text-white break-all">{deal.buyer_address}</p>
                                {isBuyer && (
                                    <span className="inline-block mt-2 text-xs px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full font-medium">
                                        You
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Deal Details Card */}
                    <div className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-blue-400">💰</span> Deal Details
                        </h3>
                        <div className="space-y-5">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <label className="text-xs text-secondary uppercase tracking-wider mb-2 block font-bold">Amount</label>
                                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                                    {deal.amount} <span className="text-xl text-white/60">{deal.token}</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <label className="text-xs text-secondary uppercase tracking-wider mb-2 block font-bold">Deadline</label>
                                    <p className={`text-sm font-medium ${isDeadlinePassed ? 'text-red-400' : 'text-white'}`}>
                                        {deadlineDate.toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-secondary mt-1">{deadlineDate.toLocaleTimeString()}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <label className="text-xs text-secondary uppercase tracking-wider mb-2 block font-bold">Network</label>
                                    <p className="text-sm text-white font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        Base
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-yellow-400">📋</span> Description
                    </h3>
                    <p className="text-secondary leading-relaxed text-lg">{deal.description}</p>
                </div>

                {/* Actions */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl blur-xl opacity-50" />
                    <div className="relative bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-green-400">⚡</span> Actions
                        </h3>

                        {/* DRAFT: Buyer creates escrow on-chain */}
                        {deal.status === 'draft' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                    <p className="text-yellow-300 text-sm font-medium">
                                        ⏳ This deal has not been created on-chain yet. The BUYER must create the escrow contract and secure funds.
                                    </p>
                                </div>

                                {!address && (
                                    <div className="text-center py-8 border border-dashed border-white/20 rounded-xl">
                                        <p className="text-secondary mb-4">Connect your wallet to proceed</p>
                                        <ConnectButton />
                                    </div>
                                )}

                                {address && isBuyer && (
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleCreateEscrow}
                                            disabled={isAnyTxPending || isCheckingBlockchain}
                                            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center justify-center gap-3"
                                        >
                                            {isCreating ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Waiting for wallet...
                                                </>
                                            ) : isCreateConfirming ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Confirming on blockchain...
                                                </>
                                            ) : isCheckingBlockchain ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Verifying contract...
                                                </>
                                            ) : (
                                                <>🚀 Create Escrow (Buyer)</>
                                            )}
                                        </button>

                                        {/* Transaction Status Display */}
                                        {(isCreating || isCreateConfirming || isCheckingBlockchain || txStatus) && (
                                            <div className={`p-3 rounded-lg border ${txStatus?.includes('successfully') || txStatus?.includes('found') ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                                                <p className={`text-sm text-center flex items-center justify-center gap-2 ${txStatus?.includes('successfully') || txStatus?.includes('found') ? 'text-green-300' : 'text-blue-300'}`}>
                                                    {(isCreating || isCreateConfirming || isCheckingBlockchain) && (
                                                        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                                    )}
                                                    {isCreating ? 'Please confirm in your wallet...' :
                                                        isCreateConfirming ? 'Waiting for blockchain confirmation...' :
                                                            isCheckingBlockchain ? 'Verifying escrow contract on blockchain...' :
                                                                txStatus}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {address && isSeller && !isBuyer && (
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
                                        <p className="text-blue-300 text-sm">
                                            ⏳ Waiting for the Buyer to create the escrow contract...
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CREATED: Buyer approves + deposits */}
                        {deal.status === 'created' && deal.escrow_address && (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <p className="text-blue-300 text-sm font-medium">
                                        📝 Escrow created. Waiting for buyer to deposit {deal.amount} USDC.
                                    </p>
                                </div>

                                {!address && (
                                    <div className="text-center py-8 border border-dashed border-white/20 rounded-xl">
                                        <p className="text-secondary mb-4">Connect your wallet to proceed</p>
                                        <ConnectButton />
                                    </div>
                                )}

                                {address && isBuyer && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            onClick={handleApproveUsdc}
                                            disabled={isAnyTxPending || !needsApproval}
                                            className="py-4 px-6 border-2 border-white/20 text-white font-bold rounded-xl hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                                        >
                                            {isApproving || isApproveConfirming ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    {isApproveConfirming ? 'Confirming...' : 'Approving...'}
                                                </>
                                            ) : !needsApproval ? (
                                                <>✅ Approved</>
                                            ) : (
                                                <>🔓 Approve USDC</>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleFundEscrow}
                                            disabled={isAnyTxPending || needsApproval}
                                            className="py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-3"
                                        >
                                            {isFunding || isFundConfirming ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    {isFundConfirming ? 'Confirming...' : 'Depositing...'}
                                                </>
                                            ) : (
                                                <>💰 Deposit {deal.amount} USDC</>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {address && isSeller && !isBuyer && (
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                                        <p className="text-purple-300 text-sm">
                                            ⏳ Waiting for the buyer to deposit funds...
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FUNDED: Buyer releases, or refund if deadline passed */}
                        {deal.status === 'funded' && deal.escrow_address && (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <p className="text-green-300 text-sm font-medium">
                                        ✅ Funds are in escrow. The buyer can release funds to the seller after receiving the goods/services.
                                    </p>
                                </div>

                                {!address && (
                                    <div className="text-center py-8 border border-dashed border-white/20 rounded-xl">
                                        <p className="text-secondary mb-4">Connect your wallet to proceed</p>
                                        <ConnectButton />
                                    </div>
                                )}

                                {address && isBuyer && (
                                    <button
                                        onClick={handleReleaseFunds}
                                        disabled={isAnyTxPending}
                                        className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-3"
                                    >
                                        {isReleasing || isReleaseConfirming ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                {isReleaseConfirming ? 'Confirming...' : 'Releasing...'}
                                            </>
                                        ) : (
                                            <>💸 Release Funds to Seller</>
                                        )}
                                    </button>
                                )}

                                {address && isSeller && !isBuyer && (
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                                        <p className="text-purple-300 text-sm">
                                            ⏳ Waiting for the buyer to release funds after receiving your goods/services...
                                        </p>
                                    </div>
                                )}

                                {/* Refund button if deadline passed */}
                                {isDeadlinePassed && address && (isBuyer || isSeller) && (
                                    <button
                                        onClick={handleRefund}
                                        disabled={isAnyTxPending}
                                        className="w-full py-4 px-6 border-2 border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                                    >
                                        {isRefunding || isRefundConfirming ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                                {isRefundConfirming ? 'Confirming...' : 'Processing...'}
                                            </>
                                        ) : (
                                            <>↩️ Refund (Deadline Passed)</>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* COMPLETED */}
                        {(deal.status === 'released' || deal.status === 'refunded') && (
                            <div className="text-center py-10 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                                <div className="text-5xl mb-4">🎉</div>
                                <p className="text-xl font-bold text-green-400">
                                    {deal.status === 'released' ? 'Deal Completed Successfully' : 'Deal Refunded'}
                                </p>
                                <p className="text-secondary mt-2">All funds have been processed.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fees */}
                <div className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-secondary">💎</span> Fees & Options
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                            <span className="text-secondary">Escrow Fee</span>
                            <span className="font-bold text-white">0.5%</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                            <span className="text-sm text-secondary">Auto-swap to $TOWNS</span>
                            <span className="text-xs px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full font-medium">Soon</span>
                        </div>
                    </div>
                </div>

                {/* Contract Info */}
                {deal.escrow_address && (
                    <div className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-cyan-400">📄</span> Contract Info
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                                <span className="text-secondary">Escrow Contract</span>
                                <a
                                    href={`https://basescan.org/address/${deal.escrow_address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                                >
                                    {deal.escrow_address.slice(0, 8)}...{deal.escrow_address.slice(-6)}
                                    <span className="text-xs">↗</span>
                                </a>
                            </div>
                            {deal.created_at && (
                                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                                    <span className="text-secondary">Created</span>
                                    <span className="text-sm text-white">{new Date(deal.created_at).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
