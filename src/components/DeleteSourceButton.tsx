'use client'
import { useRouter } from 'next/navigation'

export function DeleteSourceButton({ sourceId }: { sourceId: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this source? Its concepts may be removed too.')) return
    await fetch(`/api/sources/${sourceId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm hover:opacity-70"
      style={{ color: 'hsl(var(--destructive))' }}
    >
      Delete
    </button>
  )
}
