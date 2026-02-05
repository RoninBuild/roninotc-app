'use client'

import { useTowns } from '@/context/TownsContext'
import { useState } from 'react'

export type TransactionAction = 'create' | 'approve' | 'fund' | 'release' | 'dispute' | 'resolve'

export function useTownsTransaction() {
    const { isTowns, townsAddress, townsUserId, channelId, rawContext } = useTowns()
    const [isRequesting, setIsRequesting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const requestTransaction = async (
        dealId: string,
        action: TransactionAction,
        overrideChannelId?: string,
        userId?: string
    ) => {
        if (!isTowns) {
            throw new Error('Towns transaction only available in Towns mode')
        }

        const finalChannelId = overrideChannelId || channelId

        if (!finalChannelId) {
            console.error('Towns: channelId is missing from context!', { context: rawContext })
            const errorMsg = '❌ Error: Channel ID not found in Towns context. Cannot post transaction to chat.'
            setError(errorMsg)
            throw new Error(errorMsg)
        }

        setIsRequesting(true)
        setError(null)

        try {
            const botUrl = process.env.NEXT_PUBLIC_BOT_URL || 'https://escrowronin-bot.roninotc.workers.dev'

            const response = await fetch(`${botUrl}/api/request-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dealId,
                    action,
                    userId: userId || townsUserId || townsAddress,
                    channelId: finalChannelId,
                    smartWalletAddress: townsAddress
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to request transaction')
            }

            const data = await response.json()
            return data
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(errorMessage)
            console.error('Towns: Transaction request failed', err)
            throw err
        } finally {
            setIsRequesting(false)
        }
    }

    return {
        requestTransaction,
        isRequesting,
        error,
        isTowns,
        channelId // Expose the raw channelId from context if needed
    }
}
