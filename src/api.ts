import type { Element } from './types'
import { useStore } from './store'

const uuid = () => crypto.randomUUID()

export const combineElements = async (a: string, b: string): Promise<Element> => {
  const cached = useStore.getState().getCombination(a, b)
  if (cached) {
    return cached
  }

  const fallback: Element = {
    id: uuid(),
    name: `${a} ${b}`,
    emoji: '✨',
  }

  let result: Element = fallback
  try {
    const response = await fetch('/api/combine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ a, b }),
    })

    if (response.ok) {
      const data = (await response.json()) as Element
      if (typeof data?.name === 'string' && typeof data?.emoji === 'string') {
        result = {
          id: typeof data.id === 'string' ? data.id : uuid(),
          name: data.name,
          emoji: data.emoji,
          isNew: data.isNew,
        }
      }
    }
  } catch {
    result = fallback
  }

  useStore.getState().saveCombination(a, b, result)
  return result
}
