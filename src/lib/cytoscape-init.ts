// Register cytoscape-cose-bilkent layout
// This must only run on the client side
let _cytoscapeInitialized = false
export function initCytoscape() {
  if (typeof window === 'undefined') return
  if (_cytoscapeInitialized) return
  _cytoscapeInitialized = true
  const cytoscape = require('cytoscape')
  const coseBilkent = require('cytoscape-cose-bilkent')
  cytoscape.use(coseBilkent)
}
