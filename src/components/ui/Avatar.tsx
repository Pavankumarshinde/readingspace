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
      className="flex items-center justify-center font-bold tracking-tighter shrink-0 aspect-square"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${avatarColor(name)}, var(--primary-container))`,
        color: 'white',
        borderRadius: '50%',
        fontSize: fontSize,
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
        border: '2px solid var(--surface-container-highest)',
      }}
    >
      {getInitials(name)}
    </div>
  )
}
