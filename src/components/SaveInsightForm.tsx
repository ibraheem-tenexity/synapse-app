'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CONFIDENCE_OPTIONS = [
  { value: 'exact', label: 'Exact' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'None' },
]

export function SaveInsightForm({ conceptId }: { conceptId: string }) {
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState('medium')
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
        confidence,
      }),
    })

    setText('')
    setConfidence('medium')
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
      <div className="flex gap-2 items-center">
        <label
          className="text-xs"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          Confidence:
        </label>
        <select
          value={confidence}
          onChange={(e) => setConfidence(e.target.value)}
          className="text-xs px-2 py-1 rounded border outline-none flex-1"
          style={{
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        >
          {CONFIDENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
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
