'use client'

import { getInitials, avatarColor } from '@/lib/utils'

interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: number
  fontSize?: number
}

export default function Avatar({ name, imageUrl, size = 40, fontSize = 14 }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="shrink-0 aspect-square object-cover"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '2px solid var(--primary-fixed)',
        }}
      />
    )
  }
  
  return (
    <div
      className="flex items-center justify-center font-headline font-semibold tracking-tight shrink-0 aspect-square bg-surface-container-highest text-primary"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        fontSize: fontSize,
        border: '1px solid var(--outline-variant)',
      }}
    >
      {getInitials(name)}
    </div>
  )
}
