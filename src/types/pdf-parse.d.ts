declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion: string
    IsAcroFormPresent: boolean
    IsXFAPresent: boolean
    [key: string]: unknown
  }

  interface PDFMetadata {
    [key: string]: unknown
  }

  interface PDFData {
    numpages: number
    numrender: number
    info: PDFInfo
    metadata: PDFMetadata
    version: string
    text: string
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>
  export = pdfParse
}
