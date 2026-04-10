'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export default function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-surface-container-lowest w-full max-w-md rounded-t-[32px] sm:rounded-[40px] p-10 shadow-ambient transform transition-transform"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-on-surface-variant/10 rounded-full mx-auto mb-8 sm:hidden" />
        {title && (
          <h3 className="font-display text-3xl font-bold text-on-surface mb-8 italic tracking-tight">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  )
}
