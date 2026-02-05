'use client'

interface MemberAvatarProps {
    userId: string
    streamId: string
    fallbackName?: string
    fallbackUrl?: string
    size?: 'sm' | 'md' | 'lg'
}

/**
 * MemberAvatar - Simplified version that avoids crashing Towns SDK hooks.
 * Relies on metadata passed from the deal/context.
 */
export default function MemberAvatar({ userId, fallbackName, fallbackUrl, size = 'md' }: MemberAvatarProps) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg'
    }

    const finalName = fallbackName || userId?.slice(0, 6) || '?'
    const placeholderChar = finalName ? finalName[0].toUpperCase() : '?'

    return (
        <div className="relative inline-block">
            {fallbackUrl ? (
                <img
                    src={fallbackUrl}
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
