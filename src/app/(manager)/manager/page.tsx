'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerRoot() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/manager/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-outline/20">
      <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
    </div>
  )
}
