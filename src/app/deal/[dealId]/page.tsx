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

  const isSeller = address?.toLowerCase() === deal?.seller_address?.toLowerCase()
  const isBuyer = address?.toLowerCase() === deal?.buyer_address?.toLowerCase()

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background bg-grid flex items-center justify-center relative overflow-hidden">
        {/* Grid glow effect */}
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

  return (
    <div className="min-h-screen bg-background bg-grid relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-blue-900/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400 group-hover:to-purple-300 transition-all">
              RONIN OTC
            </span>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-8">

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
                  <p className="text-sm text-white font-medium">{deadlineDate.toLocaleDateString()}</p>
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
        <div className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
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

            {deal.status === 'draft' && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-yellow-300 text-sm font-medium">
                    ⏳ This deal has not been created on-chain yet.
                  </p>
                </div>
                {isSeller && (
                  <button className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
                    Create Escrow On-Chain
                  </button>
                )}
                {!address && (
                  <div className="text-center py-8 border border-dashed border-white/20 rounded-xl">
                    <p className="text-secondary mb-4">Connect wallet to proceed</p>
                    <ConnectButton />
                  </div>
                )}
              </div>
            )}

            {deal.status === 'created' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-300 text-sm font-medium">
                    📝 Waiting for buyer to deposit funds.
                  </p>
                </div>
                {isBuyer && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button className="py-4 px-6 border-2 border-white/20 text-white font-bold rounded-xl hover:bg-white/5 transition-all">
                      Approve USDC
                    </button>
                    <button className="py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/25">
                      Deposit {deal.amount} USDC
                    </button>
                  </div>
                )}
              </div>
            )}

            {deal.status === 'funded' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <p className="text-green-300 text-sm font-medium">
                    ✅ Funds are in escrow. Awaiting confirmation.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isSeller && (
                    <button className="py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25">
                      Release Funds
                    </button>
                  )}
                  {isBuyer && (
                    <button className="py-4 px-6 border-2 border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-500/10 transition-all">
                      Request Refund
                    </button>
                  )}
                </div>
              </div>
            )}

            {(deal.status === 'released' || deal.status === 'refunded') && (
              <div className="text-center py-10 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-xl font-bold text-green-400">Deal Completed Successfully</p>
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
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                <span className="text-secondary">Created</span>
                <span className="text-sm text-white">{new Date(deal.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
