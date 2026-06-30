'use client'
import { useRouter } from 'next/navigation'

export function DeleteInsightButton({ insightId }: { insightId: string }) {
  const router = useRouter()

  async function handleDelete() {
    await fetch(`/api/insights/${insightId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs shrink-0 hover:opacity-70"
      style={{ color: 'hsl(var(--destructive))' }}
    >
      Delete
    </button>
  )
}
