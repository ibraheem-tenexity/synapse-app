declare module 'react-cytoscapejs' {
  import * as React from 'react'
  import cytoscape from 'cytoscape'

  export interface CytoscapeComponentProps {
    elements: cytoscape.ElementDefinition[]
    stylesheet?: cytoscape.Stylesheet[] | cytoscape.StylesheetStyle[] | cytoscape.StylesheetJson[]
    layout?: cytoscape.LayoutOptions
    style?: React.CSSProperties
    cy?: (cy: cytoscape.Core) => void
    className?: string
    id?: string
    [key: string]: any
  }

  const CytoscapeComponent: React.FC<CytoscapeComponentProps>
  export default CytoscapeComponent
}
