let booted = false

export function boot() {
  if (booted || typeof window !== 'undefined') return
  booted = true
  import('./job-runner').then((m) => m.startJobRunner())
}
