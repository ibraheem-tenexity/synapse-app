import OpenAI from 'openai'

export const MODEL = 'openai/gpt-4o-mini'

let _client: OpenAI | null = null
export function getClient() {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || 'placeholder',
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://synapse.up.railway.app',
        'X-Title': 'Synapse',
      },
    })
  }
  return _client
}

export function liveAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'placeholder'
}
