'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

const STAGES = ['ingest', 'extract', 'link', 'research', 'done'] as const
type Stage = typeof STAGES[number]

interface StatusData {
  status: string
  stage: Stage | null
  log: Array<{ stage: string; message: string; ts: string }>
  error_message: string | null
}

export default function ProcessingPage() {
  const params = useParams()
  const sourceId = params.id as string
  const router = useRouter()
  const [status, setStatus] = useState<StatusData | null>(null)
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    async function poll() {
      try {
        const res = await fetch(`/api/sources/${sourceId}/status`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data)

          if (data.status === 'done') {
            // Auto-redirect to graph after 1s
            setTimeout(() => router.push('/graph'), 1000)
            return
          }
          if (data.status === 'failed') return // stop polling on failure
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
      setPollCount(c => c + 1)
      timeout = setTimeout(poll, 2000) // poll every 2 seconds
    }

    poll()
    return () => clearTimeout(timeout)
  }, [sourceId, router])

  const currentStageIdx = status?.stage
    ? STAGES.indexOf(status.stage as Stage)
    : 0

  return (
    <div className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-8 text-center" style={{ color: 'hsl(var(--foreground))' }}>
        Processing Source
      </h1>

      {/* 4-stage stepper */}
      <div className="space-y-4 mb-8">
        {(['ingest', 'extract', 'link', 'research'] as const).map((stage, idx) => {
          const isDone = currentStageIdx > idx + 1 || status?.status === 'done'
          const isActive = status?.stage === stage || (currentStageIdx === idx + 1 && status?.status !== 'done')
          const isPending = currentStageIdx <= idx && status?.status !== 'done'

          const stageLabels = {
            ingest: 'Ingest',
            extract: 'Extract Concepts',
            link: 'Link & Merge',
            research: 'Research References',
          }

          return (
            <div key={stage} className="flex items-center gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: isDone
                    ? 'hsl(var(--success, 142 71% 45%))'
                    : isActive
                    ? 'hsl(var(--brand))'
                    : 'hsl(var(--muted))',
                  color: isPending ? 'hsl(var(--muted-foreground))' : 'white',
                }}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <div className="flex-1">
                <div
                  className="text-sm font-medium"
                  style={{ color: isActive ? 'hsl(var(--brand))' : 'hsl(var(--foreground))' }}
                >
                  {stageLabels[stage]}
                  {isActive && <span className="ml-2 animate-pulse">...</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Live log */}
      {status?.log && status.log.length > 0 && (
        <div
          className="rounded-lg p-4 font-mono text-xs space-y-1"
          style={{ background: 'hsl(var(--sunken))', color: 'hsl(var(--muted-foreground))' }}
        >
          {status.log.slice(-5).map((entry, i) => (
            <div key={i}>[{entry.stage}] {entry.message}</div>
          ))}
        </div>
      )}

      {status?.status === 'done' && (
        <div className="text-center mt-6">
          <p className="text-sm" style={{ color: 'hsl(var(--success, 142 71% 45%))' }}>
            ✓ Done! Redirecting to graph...
          </p>
        </div>
      )}

      {status?.status === 'failed' && (
        <div className="text-center mt-6">
          <p className="text-sm mb-3" style={{ color: 'hsl(var(--destructive))' }}>
            Processing failed: {status.error_message || 'Unknown error'}
          </p>
          <button
            onClick={() => router.push('/library')}
            className="underline text-sm"
            style={{ color: 'hsl(var(--brand))' }}
          >
            Back to Library
          </button>
        </div>
      )}
    </div>
  )
}
