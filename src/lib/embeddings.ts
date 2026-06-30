import { getClient, liveAvailable } from './openrouter'

export async function getEmbedding(text: string): Promise<number[]> {
  if (!liveAvailable()) return getDeterministicEmbedding(text)

  try {
    const client = getClient()
    const response = await client.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: text.slice(0, 8000),
    })
    return response.data[0].embedding
  } catch {
    return getDeterministicEmbedding(text)
  }
}

function getDeterministicEmbedding(text: string): number[] {
  // Character n-gram hash into 128-dim vector, normalized
  const dims = 128
  const vec = new Array(dims).fill(0)
  for (let i = 0; i < text.length - 2; i++) {
    const trigram = text.slice(i, i + 3)
    let hash = 5381
    for (const c of trigram) hash = ((hash << 5) + hash + c.charCodeAt(0)) & 0xffffffff
    vec[Math.abs(hash) % dims] += 1
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map((v) => v / mag)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    magA = 0,
    magB = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1)
}
