// Register cytoscape-cose-bilkent layout
// Must run before CytoscapeComponent mounts, so auto-init at module evaluation time
let _cytoscapeInitialized = false

export function initCytoscape() {
  if (typeof window === 'undefined') return
  if (_cytoscapeInitialized) return
  _cytoscapeInitialized = true
  const cytoscape = require('cytoscape')
  const coseBilkent = require('cytoscape-cose-bilkent')
  cytoscape.use(coseBilkent)
}

// Auto-register when this module is first imported on the client
// This fires before any React render, ensuring layout is available when Cytoscape mounts
if (typeof window !== 'undefined') {
  initCytoscape()
}
