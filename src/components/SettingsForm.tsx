'use client'
import { useState } from 'react'

interface Props {
  user: { researchDepth: string; theme: string; density: string }
}

export function SettingsForm({ user }: Props) {
  const [researchDepth, setResearchDepth] = useState(user.researchDepth)
  const [theme, setTheme] = useState(user.theme)
  const [density, setDensity] = useState(user.density)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ researchDepth, theme, density }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-xl p-4 border" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Preferences</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              Research depth
            </label>
            <select value={researchDepth} onChange={e => setResearchDepth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
              <option value="standard">Standard</option>
              <option value="deep">Deep</option>
              <option value="light">Shallow</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>Theme</label>
            <select value={theme} onChange={e => setTheme(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>Density</label>
            <select value={density} onChange={e => setDensity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>

        <button type="submit" className="mt-4 px-4 py-2 rounded-lg text-sm text-white"
                style={{ background: 'hsl(var(--brand))' }}>
          {saved ? 'Saved!' : 'Save preferences'}
        </button>
      </div>
    </form>
  )
}
