'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid credentials')
      setLoading(false)
    } else {
      router.push('/library')
    }
  }

  async function handleDemoLogin() {
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email: 'demo@synapse.app',
      password: 'demo',
      redirect: false,
    })
    if (result?.error) {
      setError('Demo login failed')
      setLoading(false)
    } else {
      router.push('/library')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'hsl(var(--background))' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--brand))' }}>Synapse</div>
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Concept knowledge graphs from your reading
          </p>
        </div>

        <div className="rounded-2xl p-6 border"
             style={{ background: 'hsl(var(--raised))', borderColor: 'hsl(var(--border))' }}>

          {/* Demo login button - prominent */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white mb-4 disabled:opacity-50"
            style={{ background: 'hsl(var(--brand))' }}
            data-testid="demo-login">
            {loading ? 'Signing in...' : 'Continue as demo'}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }}></div>
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>or sign in with email</span>
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }}></div>
          </div>

          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" required
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              data-testid="login-email"
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password (any works for demo)"
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              data-testid="login-password"
            />
            {error && <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              data-testid="login-submit">
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Demo: demo@synapse.app · any password
        </p>
      </div>
    </div>
  )
}
