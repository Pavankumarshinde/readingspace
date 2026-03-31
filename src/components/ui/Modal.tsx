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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-surface-container-lowest w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl transform transition-transform border border-outline-variant/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-6 sm:hidden" />
        {title && (
          <h3 className="font-headline text-2xl font-bold text-primary mb-6 italic tracking-tight">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  )
}
