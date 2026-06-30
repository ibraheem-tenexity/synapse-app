import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getGraph } from '@/lib/db-helpers'
import { GraphView } from '@/components/GraphView'

export default async function GraphPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id as string

  const { concepts, relations } = await getGraph(userId)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{color: 'hsl(var(--foreground))'}}>
          Concept Graph
        </h1>
        <span className="text-sm" style={{color: 'hsl(var(--muted-foreground))'}}>
          {concepts.length} concepts · {relations.length} connections
        </span>
      </div>

      {concepts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-lg" style={{color: 'hsl(var(--muted-foreground))'}}>
            No concepts yet
          </p>
          <a href="/sources/add" className="px-4 py-2 rounded-lg text-white text-sm"
             style={{background: 'hsl(var(--brand))'}}>
            Add a source to build your graph
          </a>
        </div>
      ) : (
        <GraphView concepts={concepts} relations={relations} />
      )}
    </div>
  )
}
