'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const nav = [
  { href: '/library', label: 'Library', testId: 'nav-library', icon: '📚' },
  { href: '/graph', label: 'Graph', testId: 'nav-graph', icon: '🔮' },
  { href: '/insights', label: 'Insights', testId: 'nav-insights', icon: '💡' },
  { href: '/settings', label: 'Settings', testId: 'nav-settings', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside
      className="w-56 flex flex-col gap-1 p-4 border-r"
      style={{ background: 'hsl(var(--raised))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="mb-6 px-2">
        <span className="text-xl font-bold" style={{ color: 'hsl(var(--brand))' }}>Synapse</span>
      </div>
      {nav.map(item => (
        <Link
          key={item.href}
          href={item.href}
          data-testid={item.testId}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname?.startsWith(item.href)
              ? 'text-white'
              : 'hover:opacity-80'
          }`}
          style={
            pathname?.startsWith(item.href)
              ? { background: 'hsl(var(--brand))', color: 'white' }
              : { color: 'hsl(var(--text-primary))' }
          }
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="mt-auto text-xs px-3 py-2 text-left w-full hover:opacity-70"
        style={{ color: 'hsl(var(--muted-foreground))' }}
        data-testid="nav-signout"
      >
        Sign out
      </button>
    </aside>
  )
}
