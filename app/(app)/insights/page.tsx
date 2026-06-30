import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { insights, concepts } from '@/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { DeleteInsightButton } from '@/components/DeleteInsightButton'

const CONFIDENCE_CONFIG = {
  exact: { label: 'Exact', color: 'hsl(142, 71%, 45%)', bg: 'hsl(142, 71%, 45%, 0.1)' },
  high: { label: 'High', color: 'hsl(214, 100%, 55%)', bg: 'hsl(214, 100%, 55%, 0.1)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  low: { label: 'Low', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)' },
  none: { label: 'None', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
}

export default async function InsightsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id as string

  const allInsights = await db
    .select()
    .from(insights)
    .where(eq(insights.ownerUserId, userId))
    .orderBy(desc(insights.createdAt))

  // Fetch concept labels for insights anchored to concepts
  const conceptIds = allInsights
    .filter((i) => i.conceptId)
    .map((i) => i.conceptId as string)
  const conceptMap: Record<string, string> = {}
  if (conceptIds.length > 0) {
    const conceptRows = await db
      .select({ id: concepts.id, label: concepts.label })
      .from(concepts)
      .where(inArray(concepts.id, conceptIds))
    conceptRows.forEach((c) => (conceptMap[c.id] = c.label))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          Insights
        </h1>
        <span
          className="text-sm"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {allInsights.length} saved
        </span>
      </div>

      {allInsights.length === 0 ? (
        <div className="text-center py-20">
          <p
            className="text-lg mb-2"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            No insights yet
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Explore the graph and save insights from concept detail pages
          </p>
          <Link
            href="/graph"
            className="underline"
            style={{ color: 'hsl(var(--brand))' }}
          >
            Go to graph →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {allInsights.map((insight) => {
            const conf =
              CONFIDENCE_CONFIG[
                insight.confidence as keyof typeof CONFIDENCE_CONFIG
              ] || CONFIDENCE_CONFIG.none
            const conceptLabel = insight.conceptId
              ? conceptMap[insight.conceptId]
              : null

            return (
              <div
                key={insight.id}
                className="rounded-xl p-4 border"
                style={{
                  background: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      {insight.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {/* Confidence pill (BR12) */}
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: conf.bg, color: conf.color }}
                      >
                        {conf.label} confidence
                      </span>
                      {conceptLabel && (
                        <Link
                          href={`/concepts/${insight.conceptId}`}
                          className="text-xs hover:underline"
                          style={{ color: 'hsl(var(--brand))' }}
                        >
                          {conceptLabel}
                        </Link>
                      )}
                      <span
                        className="text-xs"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        {new Date(insight.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <DeleteInsightButton insightId={insight.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
