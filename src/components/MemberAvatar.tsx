'use client'

import { useMember } from '@towns-protocol/react-sdk'
import { useState, useMemo } from 'react'

interface MemberAvatarProps {
    userId: string
    streamId: string
    fallbackName?: string
    fallbackUrl?: string
    size?: 'sm' | 'md' | 'lg'
}

function MemberAvatarInner({ userId, streamId, fallbackName, fallbackUrl, size = 'md' }: MemberAvatarProps) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg'
    }

    const memberData = useMember({
        userId,
        streamId
    })

    const { displayName, username } = memberData || {}
    const profileImageUrl = undefined // property 'profileImageUrl' does not exist on memberData

    const finalUrl = profileImageUrl || fallbackUrl
    const finalName = displayName || username || fallbackName || userId.slice(0, 6)
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

export default function MemberAvatar(props: MemberAvatarProps) {
    if (!props.userId || !props.streamId || props.streamId === '') {
        const sizeClasses = {
            sm: 'w-8 h-8 text-xs',
            md: 'w-12 h-12 text-sm',
            lg: 'w-16 h-16 text-lg'
        }
        const finalName = props.fallbackName || props.userId?.slice(0, 6) || '?'
        const placeholderChar = finalName ? finalName[0].toUpperCase() : '?'

        return (
            <div className="relative inline-block">
                {props.fallbackUrl ? (
                    <img
                        src={props.fallbackUrl}
                        alt={finalName}
                        className={`${sizeClasses[props.size || 'md']} rounded-full border-4 border-white/20 object-cover`}
                    />
                ) : (
                    <div className={`${sizeClasses[props.size || 'md']} rounded-full bg-zinc-800 border-4 border-white/20 flex items-center justify-center font-black text-zinc-500 uppercase`}>
                        {placeholderChar}
                    </div>
                )}
            </div>
        )
    }

    return <MemberAvatarInner {...props} />
}
