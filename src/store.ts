import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Element } from './types'

type GameStore = {
  elements: Element[]
  discoveries: Set<string>
  combinations: Map<string, Element>
  addElement: (el: Element) => void
  getCombination: (a: string, b: string) => Element | undefined
  saveCombination: (a: string, b: string, result: Element) => void
  resetCache: () => void
}

type PersistedGameState = Pick<GameStore, 'elements' | 'discoveries' | 'combinations'>

type SerializedCollection =
  | { __type: 'Set'; value: string[] }
  | { __type: 'Map'; value: [string, Element][] }

const starterElements: Element[] = [
  { id: 'fire', name: 'Fire', emoji: '🔥' },
  { id: 'water', name: 'Water', emoji: '💧' },
  { id: 'earth', name: 'Earth', emoji: '🌍' },
  { id: 'wind', name: 'Wind', emoji: '💨' },
]

const normalizeName = (name: string) => name.trim().toLowerCase()
const makeCombinationKey = (a: string, b: string) => [normalizeName(a), normalizeName(b)].sort().join('|')

const isSerializedCollection = (value: unknown): value is SerializedCollection => {
  if (!value || typeof value !== 'object' || !('__type' in value)) {
    return false
  }
  const tagged = value as { __type?: unknown }
  return tagged.__type === 'Set' || tagged.__type === 'Map'
}

const storage = createJSONStorage<PersistedGameState>(() => localStorage, {
  replacer: (_key, value) => {
    if (value instanceof Set) {
      return { __type: 'Set', value: [...value] }
    }
    if (value instanceof Map) {
      return { __type: 'Map', value: [...value.entries()] }
    }
    return value
  },
  reviver: (_key, value) => {
    if (isSerializedCollection(value)) {
      if (value.__type === 'Set') {
        return new Set(value.value)
      }
      return new Map(value.value)
    }
    return value
  },
})

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      elements: starterElements,
      discoveries: new Set(starterElements.map((item) => normalizeName(item.name))),
      combinations: new Map(),

      addElement: (el) =>
        set((state) => {
          const exists = state.elements.some((item) => normalizeName(item.name) === normalizeName(el.name))
          const nextDiscoveries = new Set(state.discoveries)
          nextDiscoveries.add(normalizeName(el.name))

          if (exists) {
            return { discoveries: nextDiscoveries }
          }

          return {
            elements: [...state.elements, el],
            discoveries: nextDiscoveries,
          }
        }),

      getCombination: (a, b) => get().combinations.get(makeCombinationKey(a, b)),

      saveCombination: (a, b, result) =>
        set((state) => {
          const nextCombinations = new Map(state.combinations)
          nextCombinations.set(makeCombinationKey(a, b), result)
          const nextDiscoveries = new Set(state.discoveries)
          nextDiscoveries.add(normalizeName(result.name))

          const exists = state.elements.some(
            (item) => normalizeName(item.name) === normalizeName(result.name),
          )

          return {
            combinations: nextCombinations,
            discoveries: nextDiscoveries,
            elements: exists ? state.elements : [...state.elements, result],
          }
        }),

      resetCache: () =>
        set({
          elements: starterElements,
          discoveries: new Set(starterElements.map((item) => normalizeName(item.name))),
          combinations: new Map(),
        }),
    }),
    {
      name: 'element-craft-store',
      storage,
      partialize: (state): PersistedGameState => ({
        elements: state.elements,
        discoveries: state.discoveries,
        combinations: state.combinations,
      }),
    },
  ),
)

export const useStore = useGameStore
