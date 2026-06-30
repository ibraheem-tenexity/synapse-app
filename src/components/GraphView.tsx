'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { CytoscapeComponentProps } from 'react-cytoscapejs'

// Dynamic import to avoid SSR issues with Cytoscape
const CytoscapeComponent = dynamic<CytoscapeComponentProps>(
  () => import('react-cytoscapejs'),
  { ssr: false }
)

interface Concept {
  id: string
  label: string
  isCrossSource: boolean
  degree?: number
  shortDefinition?: string | null
}

interface Relation {
  id: string
  fromConceptId: string
  toConceptId: string
  type: string
  directed: boolean
}

interface Props {
  concepts: Concept[]
  relations: Relation[]
}

const RELATION_COLORS: Record<string, string> = {
  'is-a': '#6366f1',
  'part-of': '#8b5cf6',
  'prerequisite-of': '#f59e0b',
  'causes': '#ef4444',
  'contradicts': '#dc2626',
  'extends': '#10b981',
  'related-to': '#6b7280',
}

export function GraphView({ concepts, relations }: Props) {
  const router = useRouter()
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null)
  const [cytoscapeReady, setCytoscapeReady] = useState(false)

  useEffect(() => {
    setCytoscapeReady(true)
  }, [])

  // Build Cytoscape elements
  const elements = [
    ...concepts.map(c => ({
      data: {
        id: c.id,
        label: c.label,
        isCrossSource: c.isCrossSource,
        degree: c.degree || 0,
      }
    })),
    ...relations.map(r => ({
      data: {
        id: r.id,
        source: r.fromConceptId,
        target: r.toConceptId,
        type: r.type,
        directed: r.directed,
      }
    })),
  ]

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': 'hsl(214, 100%, 55%)',
        'label': 'data(label)',
        'color': '#ffffff',
        'font-size': '11px',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 'mapData(degree, 0, 10, 40, 80)',
        'height': 'mapData(degree, 0, 10, 40, 80)',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        'border-width': 0,
      }
    },
    {
      selector: 'node[?isCrossSource]',
      style: {
        'border-width': 3,
        'border-color': '#f59e0b',
        'border-style': 'dashed',
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#ffffff',
        'background-color': 'hsl(214, 100%, 40%)',
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#9ca3af',
        'target-arrow-color': '#9ca3af',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(type)',
        'font-size': '9px',
        'color': '#6b7280',
        'text-rotation': 'autorotate',
      }
    },
    {
      selector: 'edge[?directed]',
      style: { 'target-arrow-shape': 'triangle' }
    },
  ]

  function handleNodeClick(nodeId: string) {
    const concept = concepts.find(c => c.id === nodeId)
    if (concept) {
      setSelectedConcept(concept)
    }
  }

  return (
    <div className="flex-1 flex gap-4" style={{minHeight: '500px'}}>
      {/* Graph canvas */}
      <div className="flex-1 relative rounded-xl overflow-hidden border"
           style={{background: 'hsl(var(--sunken))', borderColor: 'hsl(var(--border))'}}>
        {cytoscapeReady && (
          <CytoscapeComponent
            elements={elements}
            stylesheet={stylesheet as any}
            layout={{ name: 'cose', animate: true, randomize: false, nodeRepulsion: 4500 } as any}
            style={{ width: '100%', height: '100%', minHeight: '500px' }}
            cy={(cy: any) => {
              cy.on('tap', 'node', (evt: any) => {
                handleNodeClick(evt.target.id())
              })
            }}
          />
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 rounded-lg p-3 text-xs space-y-1"
             style={{background: 'hsl(var(--raised))', opacity: 0.9}}>
          <div className="font-medium mb-2" style={{color: 'hsl(var(--foreground))'}}>Legend</div>
          <div className="flex items-center gap-2" style={{color: 'hsl(var(--muted-foreground))'}}>
            <span className="w-3 h-3 rounded-full inline-block" style={{background: 'hsl(214, 100%, 55%)'}}></span>
            Concept
          </div>
          <div className="flex items-center gap-2" style={{color: 'hsl(var(--muted-foreground))'}}>
            <span className="w-3 h-3 rounded-full border-2 inline-block" style={{borderColor: '#f59e0b', borderStyle: 'dashed'}}></span>
            Cross-source
          </div>
        </div>
      </div>

      {/* Concept detail panel (when selected) */}
      {selectedConcept && (
        <div className="w-72 rounded-xl p-4 border overflow-auto"
             style={{background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))'}}>
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-sm" data-testid="concept-node"
                style={{color: 'hsl(var(--foreground))'}}>{selectedConcept.label}</h3>
            <button onClick={() => setSelectedConcept(null)} className="text-xs"
                    style={{color: 'hsl(var(--muted-foreground))'}}>×</button>
          </div>
          {selectedConcept.isCrossSource && (
            <div className="text-xs px-2 py-1 rounded-full mb-3 inline-block"
                 style={{background: 'hsl(var(--warning, 45 93% 50%) / 0.1)', color: '#f59e0b'}}>
              Cross-source concept
            </div>
          )}
          {selectedConcept.shortDefinition && (
            <p className="text-xs mb-4" style={{color: 'hsl(var(--muted-foreground))'}}>
              {selectedConcept.shortDefinition}
            </p>
          )}
          <button
            onClick={() => router.push(`/concepts/${selectedConcept.id}`)}
            className="w-full py-2 rounded-lg text-sm text-white"
            style={{background: 'hsl(var(--brand))'}}>
            View concept detail →
          </button>
        </div>
      )}

      {/* Accessible tree fallback */}
      <details className="sr-only" aria-label="Concept list (accessible fallback)">
        <summary>All concepts</summary>
        <ul role="tree">
          {concepts.map(c => (
            <li key={c.id} role="treeitem" data-testid="concept-node">
              <a href={`/concepts/${c.id}`}>{c.label}</a>
              {c.isCrossSource && ' (cross-source)'}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
