'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddSourcePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'paste' | 'url' | 'upload'>('paste')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let sourceId: string

      if (tab === 'paste' || tab === 'url') {
        const body: any = { title, inputType: tab === 'paste' ? 'paste' : 'url' }
        if (tab === 'paste') body.rawText = text
        if (tab === 'url') { body.originUrl = url; body.inputType = 'url' }

        const res = await fetch('/api/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create source')
        const data = await res.json()
        sourceId = data.source.id
      } else {
        // Upload
        if (!file) throw new Error('No file selected')
        const formData = new FormData()
        formData.append('file', file)
        if (title) formData.append('title', title)

        const res = await fetch('/api/sources/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error((await res.json()).error || 'Upload failed')
        const data = await res.json()
        sourceId = data.sourceId
      }

      router.push(`/sources/${sourceId}/processing`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'hsl(var(--foreground))' }}>Add Source</h1>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 p-1 rounded-lg w-fit" style={{ background: 'hsl(var(--sunken))' }}>
        {(['paste', 'url', 'upload'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors"
            style={tab === t
              ? { background: 'hsl(var(--brand))', color: 'white' }
              : { color: 'hsl(var(--muted-foreground))' }
            }>
            {t === 'paste' ? 'Paste Text' : t === 'url' ? 'URL' : 'Upload File'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
            Title (optional)
          </label>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Attention Is All You Need"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
            style={{
              background: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              '--tw-ring-color': 'hsl(var(--brand))',
            } as any}
          />
        </div>

        {tab === 'paste' && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              Text content
            </label>
            <textarea
              value={text} onChange={e => setText(e.target.value)} required
              rows={12} placeholder="Paste your paper, book excerpt, or documentation here..."
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
          </div>
        )}

        {tab === 'url' && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              URL
            </label>
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)} required
              placeholder="https://arxiv.org/abs/1706.03762"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
          </div>
        )}

        {tab === 'upload' && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              File (PDF or Markdown, max 20 MB)
            </label>
            <input
              type="file" accept=".pdf,.md,.txt" required
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
              style={{ color: 'hsl(var(--foreground))' }}
            />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg font-medium text-white disabled:opacity-50"
          style={{ background: 'hsl(var(--brand))' }}
          data-testid="submit-source">
          {loading ? 'Adding...' : 'Add Source'}
        </button>
      </form>
    </div>
  )
}
