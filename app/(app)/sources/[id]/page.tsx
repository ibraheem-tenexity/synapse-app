import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { sources } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import Link from 'next/link'

export default async function SourceDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id as string

  const [source] = await db.select().from(sources)
    .where(and(eq(sources.id, params.id), eq(sources.ownerUserId, userId)))
    .limit(1)

  if (!source) redirect('/library')

  return (
    <div>
      <Link href="/library" className="text-sm mb-4 block" style={{ color: 'hsl(var(--brand))' }}>
        ← Library
      </Link>
      <h1 className="text-2xl font-bold mb-2">{source.title}</h1>
      <p className="text-sm mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {source.inputType} · {source.charCount.toLocaleString()} chars · Status: {source.status}
      </p>
      <div className="flex gap-3">
        <Link
          href={`/sources/${source.id}/processing`}
          className="px-4 py-2 rounded-lg text-sm border"
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        >
          View processing
        </Link>
        <Link
          href="/graph"
          className="px-4 py-2 rounded-lg text-sm text-white"
          style={{ background: 'hsl(var(--brand))' }}
        >
          View graph →
        </Link>
      </div>
    </div>
  )
}
