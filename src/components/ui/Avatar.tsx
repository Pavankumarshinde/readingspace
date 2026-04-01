'use client'

import { getInitials, avatarColor } from '@/lib/utils'

interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: number
  fontSize?: number
}

export default function Avatar({ name, imageUrl, size = 40, fontSize = 14 }: AvatarProps) {
  const bgColor = avatarColor(name)
  
  if (imageUrl) {
    return (
      <div 
         className="shrink-0 aspect-square rounded-full border-2 border-white shadow-md overflow-hidden"
         style={{ width: size, height: size }}
      >
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  
  return (
    <div
      className="flex items-center justify-center font-headline font-extrabold tracking-tight shrink-0 aspect-square text-white shadow-sm"
      style={{
        width: size,
        height: size,
        borderRadius: '35%', // Squircle/Smooth modern shape
        fontSize: fontSize,
        backgroundColor: bgColor,
        border: '2px solid rgba(255,255,255,0.2)'
      }}
    >
      {getInitials(name)}
    </div>
  )
}
