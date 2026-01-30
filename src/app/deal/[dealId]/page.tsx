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

  const getStatusEmoji = (status: string) => {
    const map: Record<string, string> = {
      draft: '',
      created: '',
      funded: '',
      released: '',
      refunded: '',
      disputed: '',
      resolved: '',
    }
    return map[status] || ''
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: 'text-yellow-500',
      created: 'text-blue-500',
      funded: 'text-green-500',
      released: 'text-purple-500',
      refunded: 'text-orange-500',
      disputed: 'text-red-500',
      resolved: 'text-cyan-500',
    }
    return map[status] || 'text-gray-500'
  }

  const isSeller = address?.toLowerCase() === deal?.seller_address.toLowerCase()
  const isBuyer = address?.toLowerCase() === deal?.buyer_address.toLowerCase()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse"></div>
          <p className="text-gray-400">Loading deal...</p>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4"></div>
          <p className="text-xl text-red-500 mb-4">{error || 'Deal not found'}</p>
          <Link href="/" className="text-neon-purple hover:underline">
             Back to home
          </Link>
        </div>
      </div>
    )
  }

  const deadlineDate = new Date(deal.deadline * 1000)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neon-purple/20 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-3xl"></div>
            <h1 className="text-2xl font-bold glow-text">RoninOTC</h1>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="neon-box rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Deal Summary</h2>
            <span className={`text-lg font-bold ${getStatusColor(deal.status)}`}>
              {getStatusEmoji(deal.status)} {deal.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Seller</label>
              <p className="font-mono text-sm break-all">{deal.seller_address}</p>
              {isSeller && <span className="text-xs text-neon-purple">(You)</span>}
            </div>
            <div>
              <label className="text-sm text-gray-400">Buyer</label>
              <p className="font-mono text-sm break-all">{deal.buyer_address}</p>
              {isBuyer && <span className="text-xs text-neon-purple">(You)</span>}
            </div>
            <div>
              <label className="text-sm text-gray-400">Amount</label>
              <p className="text-2xl font-bold">{deal.amount} {deal.token}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Deadline</label>
              <p className="text-sm">{deadlineDate.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400">Description</label>
            <p className="text-lg">{deal.description}</p>
          </div>

          <div>
            <label className="text-sm text-gray-400">Network</label>
            <p className="text-sm">Base Mainnet</p>
          </div>
        </div>

        <div className="neon-box rounded-xl p-6 space-y-4">
          <h3 className="text-xl font-bold">Actions</h3>
          
          {deal.status === 'draft' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">This deal has not been created on-chain yet.</p>
              {isSeller && (
                <button className="w-full bg-neon-purple hover:bg-neon-purple/80 text-white font-bold py-3 px-6 rounded-lg transition-all glow-border">
                  Create Escrow On-Chain
                </button>
              )}
              {!address && (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-3">Connect wallet to proceed</p>
                  <ConnectButton />
                </div>
              )}
            </div>
          )}

          {deal.status === 'created' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Waiting for buyer to deposit funds.</p>
              {isBuyer && (
                <>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                    Approve USDC
                  </button>
                  <button className="w-full bg-neon-purple hover:bg-neon-purple/80 text-white font-bold py-3 px-6 rounded-lg transition-all glow-border">
                    Deposit {deal.amount} USDC
                  </button>
                </>
              )}
            </div>
          )}

          {deal.status === 'funded' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Funds are in escrow. Seller can release or buyer can request refund.</p>
              {isSeller && (
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all glow-border">
                  Release Funds to Buyer
                </button>
              )}
              {isBuyer && (
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                  Request Refund
                </button>
              )}
            </div>
          )}

          {(deal.status === 'released' || deal.status === 'refunded') && (
            <div className="text-center py-4">
              <p className="text-lg font-bold text-green-500"> Deal Completed</p>
            </div>
          )}
        </div>

        <div className="neon-box rounded-xl p-6 space-y-4">
          <h3 className="text-xl font-bold">Fees & Options</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Escrow Fee</span>
              <span>0.5%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
              <span className="text-sm">Auto-swap fee to $TOWNS</span>
              <span className="text-xs px-2 py-1 bg-neon-purple/20 text-neon-purple rounded">Coming Soon</span>
            </div>
          </div>
        </div>

        <div className="neon-box rounded-xl p-6 space-y-3">
          <h3 className="text-xl font-bold">Deal Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Deal ID</span>
              <span className="font-mono">{deal.deal_id}</span>
            </div>
            {deal.escrow_address && (
              <div className="flex justify-between">
                <span className="text-gray-400">Escrow Contract</span>
                <a 
                  href={`https://basescan.org/address/${deal.escrow_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-neon-purple hover:underline"
                >
                  {deal.escrow_address.slice(0, 6)}...{deal.escrow_address.slice(-4)}
                </a>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Created</span>
              <span>{new Date(deal.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}