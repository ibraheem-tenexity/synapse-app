import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSources } from '@/lib/db-helpers'
import Link from 'next/link'
import { DeleteSourceButton } from '@/components/DeleteSourceButton'

export default async function LibraryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id as string
  const allSources = await getSources(userId)

  const totalConcepts = allSources.reduce((s, src) => s + src.conceptCount, 0)
  const doneSources = allSources.filter(s => s.status === 'done').length

  return (
    <div>
      {/* Pulse strip — metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard label="Sources" value={allSources.length} />
        <MetricCard label="Concepts" value={totalConcepts} />
        <MetricCard label="Processed" value={doneSources} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Library</h1>
        <Link
          href="/sources/add"
          data-testid="add-source"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'hsl(var(--brand))' }}
        >
          + Add source
        </Link>
      </div>

      {/* Source list */}
      {allSources.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <p className="text-lg mb-4">No sources yet</p>
          <Link href="/sources/add" className="underline" style={{ color: 'hsl(var(--brand))' }}>
            Add your first source →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {allSources.map(source => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand))' }}>{value}</div>
      <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</div>
    </div>
  )
}

const statusColors: Record<string, string> = {
  queued: 'hsl(var(--muted-foreground))',
  processing: 'hsl(var(--warning))',
  done: 'hsl(var(--success))',
  failed: 'hsl(var(--destructive))',
}

function SourceCard({ source }: { source: Awaited<ReturnType<typeof getSources>>[number] }) {
  return (
    <div
      className="rounded-xl p-4 border flex items-center justify-between"
      style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex-1 min-w-0">
        <Link
          href={`/sources/${source.id}`}
          className="font-medium hover:underline truncate block"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {source.title}
        </Link>
        <div
          className="flex items-center gap-3 mt-1 text-sm"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          <span className="capitalize">{source.inputType}</span>
          <span>·</span>
          <span>{source.conceptCount} concepts</span>
          {source.charCount > 0 && (
            <>
              <span>·</span>
              <span>{(source.charCount / 1000).toFixed(1)}k chars</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="px-2 py-1 rounded-full text-xs font-medium capitalize"
          style={{
            background: statusColors[source.status] ?? 'hsl(var(--muted))',
            color: 'white',
          }}
        >
          {source.status}
        </span>
        <DeleteSourceButton sourceId={source.id} />
      </div>
    </div>
  )
}
