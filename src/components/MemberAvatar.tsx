'use client'

import { useMember } from '@towns-protocol/react-sdk'
import { useState, useMemo } from 'react'

interface MemberAvatarProps {
    userId: string
    streamId: string
    fallbackName?: string // e.g. "Seller" or "0x123..."
    fallbackUrl?: string // if deal has a stored one
    size?: 'sm' | 'md' | 'lg'
}

export default function MemberAvatar({ userId, streamId, fallbackName, fallbackUrl, size = 'md' }: MemberAvatarProps) {
    // Robust Stream ID handling
    const validStreamId = useMemo(() => {
        if (!streamId) return ''
        // Ensure it's a string
        return String(streamId)
    }, [streamId])

    // Determine sizes
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg'
    }

    // Attempt to fetch member data from Towns
    // We wrap in try/catch conceptually (hooks don't throw usually) or check validStreamId
    const memberData = useMember({
        userId: userId,
        streamId: validStreamId
    })

    const { displayName, profileImageUrl, username } = memberData || {}

    // Priority: Live Data > Fallback URL > Placeholder
    const finalUrl = profileImageUrl || fallbackUrl
    const finalName = displayName || username || fallbackName || userId.slice(0, 6)

    // Placeholder Logic
    const placeholderChar = finalName ? finalName[0].toUpperCase() : '?'

    return (
        <div className="relative inline-block">
            {finalUrl ? (
                <img
                    src={finalUrl}
                    alt={finalName}
                    className={`${sizeClasses[size]} rounded-full border-4 border-white/20 object-cover`}
                />
            ) : (
                <div className={`${sizeClasses[size]} rounded-full bg-zinc-800 border-4 border-white/20 flex items-center justify-center font-black text-zinc-500 uppercase`}>
                    {placeholderChar}
                </div>
            )}
        </div>
    )
}
