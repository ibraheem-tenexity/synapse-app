import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen" style={{ background: 'hsl(var(--background))' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto p-6" style={{ color: 'hsl(var(--foreground))' }}>
        {children}
      </main>
    </div>
  )
}
