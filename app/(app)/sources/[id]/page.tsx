import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { sources } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import Link from 'next/link'
import { ReprocessButton } from '@/components/ReprocessButton'

export default async function SourceDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id as string

  const [source] = await db.select().from(sources)
    .where(and(eq(sources.id, params.id), eq(sources.ownerUserId, userId)))
    .limit(1)

  if (!source) redirect('/library')

  // Use raw SQL to filter concepts that have this source in their source_ids array
  const sourceConceptRows = await db.execute<{
    id: string
    label: string
    short_definition: string | null
    is_cross_source: boolean
  }>(
    sql`SELECT id, label, short_definition, is_cross_source
        FROM concepts
        WHERE owner_user_id = ${userId}
        AND ${params.id}::uuid = ANY(source_ids)
        ORDER BY label ASC`
  )

  const sourceConceptList = Array.from(sourceConceptRows)

  const statusColors: Record<string, string> = {
    queued: 'hsl(var(--muted-foreground))',
    processing: '#f59e0b',
    done: 'hsl(142, 71%, 45%)',
    failed: 'hsl(var(--destructive))',
  }

  return (
    <div>
      <Link href="/library" className="text-sm mb-4 block" style={{ color: 'hsl(var(--brand))' }}>
        ← Library
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{source.title}</h1>
          <div className="flex items-center gap-3 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <span className="capitalize">{source.inputType}</span>
            <span>·</span>
            <span>{source.charCount.toLocaleString()} chars</span>
            <span>·</span>
            <span className="font-medium" style={{ color: statusColors[source.status] }}>
              {source.status}
            </span>
          </div>
          {source.originUrl && (
            <a href={source.originUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs mt-1 block hover:underline" style={{ color: 'hsl(var(--brand))' }}>
              {source.originUrl}
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/sources/${source.id}/processing`}
                className="px-3 py-1.5 rounded-lg text-sm border"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
            Processing log
          </Link>
          <ReprocessButton sourceId={source.id} />
        </div>
      </div>

      {/* Concepts grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          Concepts ({sourceConceptList.length})
        </h2>

        {sourceConceptList.length === 0 ? (
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {source.status === 'done' ? 'No concepts extracted' : 'Processing not complete yet'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sourceConceptList.map(concept => (
              <Link key={concept.id} href={`/concepts/${concept.id}`}
                    className="p-3 rounded-lg border hover:opacity-80 transition-opacity"
                    style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'hsl(var(--foreground))' }}>{concept.label}</div>
                {concept.short_definition && (
                  <p className="text-xs line-clamp-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {concept.short_definition}
                  </p>
                )}
                {concept.is_cross_source && (
                  <span className="text-xs mt-1 block" style={{ color: '#f59e0b' }}>cross-source</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
