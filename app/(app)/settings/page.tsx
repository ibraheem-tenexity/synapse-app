import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { SettingsForm } from '@/components/SettingsForm'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id as string

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) redirect('/login')

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'hsl(var(--foreground))' }}>Settings</h1>
      <SettingsForm user={{
        researchDepth: user.researchDepth,
        theme: user.theme,
        density: user.density,
      }} />

      {/* Export */}
      <div className="mt-8 rounded-xl p-4 border" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Export data</h3>
        <p className="text-xs mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Download all your concepts, relations, and insights as JSON.
        </p>
        <a href="/api/export" download="synapse-export.json"
           className="px-4 py-2 rounded-lg text-sm border inline-block"
           style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
          Download export
        </a>
      </div>

      {/* Demo account info */}
      <div className="mt-6 rounded-xl p-4 border" style={{ background: 'hsl(var(--sunken))', borderColor: 'hsl(var(--border))' }}>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Logged in as <strong>{user.email}</strong> (demo account)
        </p>
      </div>
    </div>
  )
}
