import { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

type CombinePayload = {
  a?: string
  b?: string
}

const readJsonBody = async <T>(req: IncomingMessage): Promise<T | null> => {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (!chunks.length) {
    return null
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
  } catch {
    return null
  }
}

const normalize = (value: string) => value.trim().toLowerCase()
const fallbackElement = (a: string, b: string) => ({
  id: crypto.randomUUID(),
  name: `${a} ${b}`.trim(),
  emoji: '✨',
})

const stripMarkdownCodeFences = (value: string) =>
  value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

const extractJsonObject = (value: string): { name?: unknown; emoji?: unknown } | null => {
  const cleaned = stripMarkdownCodeFences(value)
  try {
    return JSON.parse(cleaned) as { name?: unknown; emoji?: unknown }
  } catch {
    // Fall back to extracting the first JSON object from mixed text.
  }

  const match = value.match(/\{[\s\S]*\}/)
  if (!match) {
    return null
  }
  try {
    return JSON.parse(match[0]) as { name?: unknown; emoji?: unknown }
  } catch {
    return null
  }
}

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const geminiCombinePlugin = (): Plugin => ({
  name: 'gemini-combine-api',
  configureServer(server) {
    const env = loadEnv(server.config.mode, process.cwd(), '')
    const geminiApiKey = env.GEMINI_API_KEY?.trim() ?? ''
    const geminiModel = env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

    server.middlewares.use('/api/combine', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }

      const body = await readJsonBody<CombinePayload>(req)
      const a = typeof body?.a === 'string' ? body.a.trim() : ''
      const b = typeof body?.b === 'string' ? body.b.trim() : ''

      if (!a || !b) {
        sendJson(res, 400, { error: 'Invalid combination payload' })
        return
      }

      if (!geminiApiKey) {
        console.warn('[combine-api] GEMINI_API_KEY missing, using fallback')
        sendJson(res, 200, fallbackElement(a, b))
        return
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: 'You are a JSON-only element combiner for an Infinite Craft style game. Output exactly one JSON object with keys "name" and "emoji". Never output markdown, code fences, explanations, prefixes, or suffixes. "name" must be 1-3 words and non-empty. "emoji" must be exactly one emoji character. Return only raw JSON.',
                  },
                ],
              },
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `Inputs: A="${a}", B="${b}". Invent one logical combined element. Return only {"name":"...","emoji":"..."}.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: 512,
                temperature: 0.2,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'OBJECT',
                  required: ['name', 'emoji'],
                  properties: {
                    name: { type: 'STRING' },
                    emoji: { type: 'STRING' },
                  },
                },
              },
            }),
          },
        )

        if (!response.ok) {
          const errorBody = await response.text()
          console.error('[combine-api] Gemini request failed', {
            status: response.status,
            statusText: response.statusText,
            body: errorBody,
          })
          sendJson(res, 200, fallbackElement(a, b))
          return
        }

        const data = (await response.json()) as {
          candidates?: Array<{
            finishReason?: string
            content?: { parts?: Array<{ text?: string }> }
          }>
        }
        const candidate = data.candidates?.[0]
        const text = (candidate?.content?.parts ?? [])
          .map((part) => (typeof part.text === 'string' ? part.text : ''))
          .join('\n')
          .trim()
        const parsed = extractJsonObject(text)

        if (typeof parsed?.name !== 'string' || typeof parsed?.emoji !== 'string') {
          console.warn('[combine-api] Gemini response parse failed', {
            finishReason: candidate?.finishReason,
            rawText: text,
          })
          sendJson(res, 200, fallbackElement(a, b))
          return
        }

        sendJson(res, 200, {
          id: crypto.randomUUID(),
          name: parsed.name.trim(),
          emoji: parsed.emoji,
          isNew: ![normalize(a), normalize(b)].includes(normalize(parsed.name)),
        })
      } catch (error) {
        console.error('[combine-api] Unexpected Gemini error', error)
        sendJson(res, 200, fallbackElement(a, b))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), geminiCombinePlugin()],
})
