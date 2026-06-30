let booted = false

export function boot() {
  if (booted || typeof window !== 'undefined') return
  booted = true
  // Run DB migrations before starting job runner
  import('../db/migrate').then((m) => m.default()).catch((err) => {
    console.error('[boot] Migration failed:', err)
  }).finally(() => {
    import('./job-runner').then((m) => m.startJobRunner())
  })
}
