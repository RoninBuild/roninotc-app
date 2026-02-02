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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'text-yellow-500',
      created: 'text-blue-500',
      funded: 'text-green-500',
      released: 'text-purple-500',
      refunded: 'text-orange-500',
      disputed: 'text-red-500',
      resolved: 'text-cyan-500',
    }
    return colors[status] || 'text-gray-500'
  }

  const isSeller = address?.toLowerCase() === deal?.seller_address.toLowerCase()
  const isBuyer = address?.toLowerCase() === deal?.buyer_address.toLowerCase()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚔️</div>
          <p className="text-gray-400">Loading deal...</p>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-xl text-red-500 mb-4">{error || 'Deal not found'}</p>
          <Link href="/" className="text-white hover:text-gray-300 underline">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  const deadlineDate = new Date(deal.deadline * 1000)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-semibold hover:text-gray-300">
            RoninOTC
          </Link>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Status Header */}
        <div className="border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Deal Summary</h2>
              <p className="text-sm text-gray-500">ID: {deal.deal_id}</p>
            </div>
            <div className={`text-sm font-semibold px-4 py-2 border border-gray-800 rounded-full ${getStatusColor(deal.status)}`}>
              {deal.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Deal Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participants */}
          <div className="border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Participants</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Seller</label>
                <p className="font-mono text-sm break-all">{deal.seller_address}</p>
                {isSeller && <span className="text-xs text-gray-400 mt-1 inline-block">(You)</span>}
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Buyer</label>
                <p className="font-mono text-sm break-all">{deal.buyer_address}</p>
                {isBuyer && <span className="text-xs text-gray-400 mt-1 inline-block">(You)</span>}
              </div>
            </div>
          </div>

          {/* Deal Details */}
          <div className="border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Deal Details</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Amount</label>
                <p className="text-2xl font-bold">{deal.amount} {deal.token}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Deadline</label>
                <p className="text-sm">{deadlineDate.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Network</label>
                <p className="text-sm">Base Mainnet</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Description</h3>
          <p className="text-gray-300">{deal.description}</p>
        </div>

        {/* Actions */}
        <div className="border border-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Actions</h3>

          {deal.status === 'draft' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 p-4 border border-gray-800 rounded-lg">
                This deal has not been created on-chain yet.
              </p>
              {isSeller && (
                <button className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                  Create Escrow On-Chain
                </button>
              )}
              {!address && (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-3">Connect wallet to proceed</p>
                  <ConnectButton />
                </div>
              )}
            </div>
          )}

          {deal.status === 'created' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 p-4 border border-gray-800 rounded-lg">
                Waiting for buyer to deposit funds.
              </p>
              {isBuyer && (
                <>
                  <button className="w-full py-3 px-4 border border-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors">
                    Approve USDC
                  </button>
                  <button className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                    Deposit {deal.amount} USDC
                  </button>
                </>
              )}
            </div>
          )}

          {deal.status === 'funded' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 p-4 border border-gray-800 rounded-lg">
                Funds are in escrow. Seller can release or buyer can request refund.
              </p>
              {isSeller && (
                <button className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                  Release Funds to Buyer
                </button>
              )}
              {isBuyer && (
                <button className="w-full py-3 px-4 border border-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors">
                  Request Refund
                </button>
              )}
            </div>
          )}

          {(deal.status === 'released' || deal.status === 'refunded') && (
            <div className="text-center py-8 border border-gray-800 rounded-lg">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-lg font-semibold text-green-500">Deal Completed</p>
            </div>
          )}
        </div>

        {/* Fees */}
        <div className="border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Fees & Options</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 border border-gray-800 rounded-lg">
              <span className="text-gray-400">Escrow Fee</span>
              <span className="font-semibold">0.5%</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-800 rounded-lg">
              <span className="text-sm text-gray-400">Auto-swap fee to $TOWNS</span>
              <span className="text-xs px-3 py-1 border border-gray-800 text-gray-400 rounded-full">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Contract Info */}
        {deal.escrow_address && (
          <div className="border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Contract Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border border-gray-800 rounded-lg">
                <span className="text-sm text-gray-400">Escrow Contract</span>
                <a
                  href={`https://basescan.org/address/${deal.escrow_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-white hover:text-gray-300"
                >
                  {deal.escrow_address.slice(0, 6)}...{deal.escrow_address.slice(-4)} ↗
                </a>
              </div>
              <div className="flex justify-between items-center p-3 border border-gray-800 rounded-lg">
                <span className="text-sm text-gray-400">Created</span>
                <span className="text-sm">{new Date(deal.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
