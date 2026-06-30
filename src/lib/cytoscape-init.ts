// Register cytoscape-cose-bilkent layout
// This must only run on the client side
export function initCytoscape() {
  if (typeof window === 'undefined') return
  // Dynamic require to avoid SSR issues
  const cytoscape = require('cytoscape')
  const coseBilkent = require('cytoscape-cose-bilkent')
  if (!cytoscape('layout', 'cose-bilkent')) {
    cytoscape.use(coseBilkent)
  }
}
