'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { getDeal } from '@/lib/api'
import type { Deal } from '@/lib/types'
import Link from 'next/link'

export default function DealPage() {
  const params = useParams()
  const dealId = params.dealId as string
  const { address } = useAccount()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDeal() {
      try {
        setLoading(true)
        const data = await getDeal(dealId)
        if (!data) {
          setError('Deal not found')
        } else {
          setDeal(data)
        }
      } catch (err) {
        setError('Failed to load deal')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadDeal()
  }, [dealId])

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
      draft: { emoji: '⏳', color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Draft' },
      created: { emoji: '📝', color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Created' },
      funded: { emoji: '✅', color: 'text-green-400', bg: 'bg-green-500/10', label: 'Funded' },
      released: { emoji: '💸', color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Released' },
      refunded: { emoji: '↩️', color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Refunded' },
      disputed: { emoji: '⚠️', color: 'text-red-400', bg: 'bg-red-500/10', label: 'Disputed' },
      resolved: { emoji: '✔️', color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Resolved' },
    }
    return configs[status] || { emoji: '❓', color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Unknown' }
  }

  const isSeller = address?.toLowerCase() === deal?.seller_address.toLowerCase()
  const isBuyer = address?.toLowerCase() === deal?.buyer_address.toLowerCase()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto animate-pulse border border-indigo-500/30">
            <div className="text-4xl">⚔️</div>
          </div>
          <p className="text-gray-400 font-medium">Loading deal...</p>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto border border-red-500/30">
            <div className="text-5xl">❌</div>
          </div>
          <div className="space-y-2">
            <p className="text-xl text-red-400 font-bold">{error || 'Deal not found'}</p>
            <p className="text-gray-500 text-sm">The deal ID may be incorrect or the deal does not exist</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(deal.status)
  const deadlineDate = new Date(deal.deadline * 1000)

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />

      <header className="relative border-b border-white/5 bg-black/30 backdrop-blur-xl z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold shadow-lg">
              R
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              RoninOTC
            </h1>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <main className="relative flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6 z-10">
        {/* Status Banner */}
        <div className="gradient-border rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                Deal Summary
              </h2>
              <p className="text-gray-500 text-sm">ID: {deal.deal_id}</p>
            </div>
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl ${statusConfig.bg} border border-white/10`}>
              <span className="text-2xl">{statusConfig.emoji}</span>
              <div>
                <div className={`text-sm font-bold ${statusConfig.color}`}>
                  {statusConfig.label.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deal Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participants */}
          <div className="neon-box rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">👥</span> Participants
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Seller</label>
                <p className="font-mono text-sm break-all text-gray-300">{deal.seller_address}</p>
                {isSeller && (
                  <span className="inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    You
                  </span>
                )}
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Buyer</label>
                <p className="font-mono text-sm break-all text-gray-300">{deal.buyer_address}</p>
                {isBuyer && (
                  <span className="inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    You
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Deal Details */}
          <div className="neon-box rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">📊</span> Deal Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Amount</label>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {deal.amount}
                  </p>
                  <span className="text-lg text-gray-400 font-medium">{deal.token}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Deadline</label>
                <p className="text-sm text-gray-300">{deadlineDate.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Network</label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-sm text-gray-300 font-medium">Base Mainnet</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="neon-box rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">📝</span> Description
          </h3>
          <p className="text-gray-300 leading-relaxed">{deal.description}</p>
        </div>

        {/* Actions */}
        <div className="gradient-border rounded-2xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-white">Actions</h3>

          {deal.status === 'draft' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                ⏳ This deal has not been created on-chain yet. The seller needs to create the escrow contract.
              </p>
              {isSeller && (
                <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transform hover:scale-[1.02] active:scale-[0.98]">
                  Create Escrow On-Chain
                </button>
              )}
              {!address && (
                <div className="text-center py-6 bg-black/30 rounded-xl border border-white/5">
                  <p className="text-gray-400 mb-4">Connect your wallet to proceed</p>
                  <ConnectButton />
                </div>
              )}
            </div>
          )}

          {deal.status === 'created' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                📝 Escrow created. Waiting for buyer to deposit funds.
              </p>
              {isBuyer && (
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transform hover:scale-[1.02] active:scale-[0.98]">
                    Approve USDC
                  </button>
                  <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transform hover:scale-[1.02] active:scale-[0.98]">
                    Deposit {deal.amount} USDC
                  </button>
                </div>
              )}
            </div>
          )}

          {deal.status === 'funded' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                ✅ Funds are securely held in escrow. Seller can release or buyer can request a refund.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {isSeller && (
                  <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] transform hover:scale-[1.02] active:scale-[0.98]">
                    Release Funds
                  </button>
                )}
                {isBuyer && (
                  <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] transform hover:scale-[1.02] active:scale-[0.98]">
                    Request Refund
                  </button>
                )}
              </div>
            </div>
          )}

          {(deal.status === 'released' || deal.status === 'refunded') && (
            <div className="text-center py-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-xl font-bold text-green-400 mb-2">Deal Completed</p>
              <p className="text-sm text-gray-400">Transaction has been finalized</p>
            </div>
          )}
        </div>

        {/* Fees */}
        <div className="neon-box rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">💰</span> Fees & Options
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 rounded-xl bg-black/30 border border-white/5">
              <span className="text-gray-400">Escrow Fee</span>
              <span className="font-bold text-indigo-400">0.5%</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Auto-swap fee to $TOWNS</span>
              </div>
              <span className="text-xs px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full font-bold border border-purple-500/30">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        {/* Contract Info */}
        {deal.escrow_address && (
          <div className="neon-box rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">🔗</span> Contract Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 rounded-xl bg-black/30 border border-white/5">
                <span className="text-sm text-gray-400">Escrow Contract</span>
                <a
                  href={`https://basescan.org/address/${deal.escrow_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2"
                >
                  {deal.escrow_address.slice(0, 6)}...{deal.escrow_address.slice(-4)}
                  <span className="text-xs">↗</span>
                </a>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-black/30 border border-white/5">
                <span className="text-sm text-gray-400">Created</span>
                <span className="text-sm text-gray-300">{new Date(deal.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
