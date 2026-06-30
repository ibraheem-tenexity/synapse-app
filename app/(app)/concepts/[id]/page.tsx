import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getConcept } from '@/lib/db-helpers'
import { db } from '@/db'
import { sources } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { SaveInsightForm } from '@/components/SaveInsightForm'
import { DeepResearchButton } from '@/components/DeepResearchButton'

export default async function ConceptDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id as string

  const concept = await getConcept(userId, params.id)
  if (!concept) redirect('/graph')

  // Fetch source titles for source IDs
  const sourceList =
    concept.sourceIds?.length > 0
      ? await db
          .select({ id: sources.id, title: sources.title })
          .from(sources)
          .where(inArray(sources.id, concept.sourceIds as string[]))
      : []

  const sourceMap = Object.fromEntries(sourceList.map((s) => [s.id, s.title]))

  return (
    <div>
      {/* Back link */}
      <Link href="/graph" className="text-sm mb-4 block" style={{ color: 'hsl(var(--brand))' }}>
        ← Graph
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            {concept.label}
          </h1>
          <div className="flex gap-2 flex-wrap">
            {concept.isCrossSource && (
              <span
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  background: 'hsl(45 93% 50% / 0.15)',
                  color: '#d97706',
                }}
              >
                Cross-source concept
              </span>
            )}
            <span
              className="px-2 py-1 rounded-full text-xs"
              style={{
                background: 'hsl(var(--muted))',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              {concept.sourceIds?.length || 1} source
              {(concept.sourceIds?.length || 1) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Definition + Aliases + Sources + Save Insight */}
        <div className="lg:col-span-1 space-y-6">
          {concept.shortDefinition && (
            <Section title="Definition">
              <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                {concept.shortDefinition}
              </p>
            </Section>
          )}

          {concept.aliases && (concept.aliases as string[]).length > 0 && (
            <Section title="Also known as">
              <div className="flex flex-wrap gap-2">
                {(concept.aliases as string[]).map((a) => (
                  <span
                    key={a}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: 'hsl(var(--sunken))',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Section title="Sources">
            <div className="space-y-1">
              {((concept.sourceIds as string[]) || []).map((sid) => (
                <Link
                  key={sid}
                  href={`/sources/${sid}`}
                  className="text-sm block hover:underline"
                  style={{ color: 'hsl(var(--brand))' }}
                >
                  {sourceMap[sid] || 'Unknown source'}
                </Link>
              ))}
            </div>
          </Section>

          {/* Save insight */}
          <Section title="Save insight">
            <SaveInsightForm conceptId={concept.id} />
          </Section>
        </div>

        {/* Column 2: Mentions + Related concepts */}
        <div className="lg:col-span-1 space-y-6">
          <Section title={`Mentions (${concept.mentions?.length || 0})`}>
            {(concept.mentions as any[])?.length > 0 ? (
              <div className="space-y-3">
                {(concept.mentions as any[]).slice(0, 5).map((m: any, i: number) => (
                  <div
                    key={i}
                    className="text-xs p-3 rounded-lg italic"
                    style={{
                      background: 'hsl(var(--sunken))',
                      color: 'hsl(var(--foreground))',
                    }}
                  >
                    &ldquo;...{m.snippet}...&rdquo;
                    {m.source_id && sourceMap[m.source_id] && (
                      <div
                        className="mt-1 not-italic"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        from: {sourceMap[m.source_id]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                No mentions recorded
              </p>
            )}
          </Section>

          {/* Neighbors */}
          <Section title={`Related concepts (${concept.neighbors?.length || 0})`}>
            {concept.neighbors?.length > 0 ? (
              <div className="space-y-2">
                {concept.neighbors.map((n: any) => (
                  <Link
                    key={n.id}
                    href={`/concepts/${n.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:opacity-80 text-sm"
                    style={{ background: 'hsl(var(--sunken))' }}
                  >
                    <span style={{ color: 'hsl(var(--foreground))' }}>{n.label}</span>
                    <span
                      className="text-xs ml-auto"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      {n.relationType}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                No related concepts yet
              </p>
            )}
          </Section>
        </div>

        {/* Column 3: References */}
        <div className="lg:col-span-1">
          <Section title="Further reading">
            <DeepResearchButton
              conceptId={concept.id}
              referencesStatus={concept.referencesStatus}
            />

            {concept.refs?.length > 0 && (
              <div className="mt-4 space-y-3">
                {concept.refs.map((ref: any) => (
                  <div
                    key={ref.id}
                    className="p-3 rounded-lg border text-sm"
                    style={{
                      background: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  >
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline block mb-1"
                      style={{ color: 'hsl(var(--brand))' }}
                    >
                      {ref.title}
                    </a>
                    {ref.snippet && (
                      <p
                        className="text-xs italic"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        {ref.snippet.slice(0, 150)}...
                      </p>
                    )}
                    <span
                      className="text-xs mt-1 block"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      {ref.sourceKind || 'web'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {concept.referencesStatus === 'none' && concept.refs?.length === 0 && (
              <p className="text-xs mt-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Click &ldquo;Run deep research&rdquo; to find references for this concept.
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
    >
      <h3
        className="text-sm font-semibold mb-3"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}
