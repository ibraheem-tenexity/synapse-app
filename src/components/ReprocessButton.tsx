'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ReprocessButton({ sourceId }: { sourceId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleReprocess() {
    setLoading(true)
    await fetch(`/api/sources/${sourceId}/reprocess`, { method: 'POST' })
    router.push(`/sources/${sourceId}/processing`)
    setLoading(false)
  }

  return (
    <button onClick={handleReprocess} disabled={loading}
      className="px-3 py-1.5 rounded-lg text-sm text-white disabled:opacity-50"
      style={{ background: 'hsl(var(--brand))' }}>
      {loading ? '...' : 'Reprocess'}
    </button>
  )
}
