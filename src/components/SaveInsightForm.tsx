'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SaveInsightForm({ conceptId }: { conceptId: string }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: text,
        anchorType: 'concept',
        conceptId,
        confidence: 'medium',
      }),
    })
    setText('')
    setSaving(false)
    router.push('/insights')
  }

  return (
    <form onSubmit={handleSave} className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Write an insight about this concept..."
        className="w-full px-3 py-2 rounded-lg border text-xs outline-none resize-none"
        style={{
          background: 'hsl(var(--background))',
          borderColor: 'hsl(var(--border))',
          color: 'hsl(var(--foreground))',
        }}
      />
      <button
        type="submit"
        disabled={saving || !text.trim()}
        className="w-full py-1.5 rounded text-xs text-white disabled:opacity-50"
        style={{ background: 'hsl(var(--brand))' }}
        data-testid="save-insight"
      >
        {saving ? 'Saving...' : 'Save insight'}
      </button>
    </form>
  )
}
