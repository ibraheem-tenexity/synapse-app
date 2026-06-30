'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeepResearchButton({
  conceptId,
  referencesStatus,
}: {
  conceptId: string
  referencesStatus: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleResearch() {
    setLoading(true)
    await fetch(`/api/concepts/${conceptId}/references`, { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  if (referencesStatus === 'ready') {
    return <div className="text-xs text-green-600">✓ References loaded</div>
  }

  if (referencesStatus === 'generating') {
    return (
      <div
        className="text-xs animate-pulse"
        style={{ color: 'hsl(var(--brand))' }}
      >
        Researching references...
      </div>
    )
  }

  return (
    <button
      onClick={handleResearch}
      disabled={loading}
      className="w-full py-2 rounded-lg text-sm text-white disabled:opacity-50"
      style={{ background: 'hsl(var(--brand))' }}
      data-testid="deep-research-btn"
    >
      {loading ? 'Starting...' : 'Run deep research'}
    </button>
  )
}
