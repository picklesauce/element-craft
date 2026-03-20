import { useMemo, useState } from 'react'
import { GameBoard } from './components/GameBoard'
import type { SpawnRequest } from './components/GameBoard'
import { Sidebar } from './components/Sidebar'
import { useStore } from './store'

function App() {
  const elements = useStore((state) => state.elements)
  const discoveries = useStore((state) => state.discoveries)
  const resetCache = useStore((state) => state.resetCache)
  const [spawnRequest, setSpawnRequest] = useState<SpawnRequest | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const discoveredElements = useMemo(
    () =>
      elements.filter((element) => discoveries.has(element.name.trim().toLowerCase())),
    [elements, discoveries],
  )

  const handleSpawnElement = (element: (typeof discoveredElements)[number]) => {
    setSpawnRequest({
      requestId: Date.now() + Math.floor(Math.random() * 1000),
      element,
    })
  }

  const handleResetBoard = () => {
    setResetSignal((prev) => prev + 1)
  }

  const handleResetCache = () => {
    resetCache()
    setResetSignal((prev) => prev + 1)
    setSpawnRequest(null)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">Element Craft</h1>
        <p className="mt-2 text-sm text-slate-300">
          Start with Fire, Water, Earth, and Wind. Combine two elements to discover something new.
        </p>
      </header>

      <section className="grid flex-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="min-h-[28rem]">
          <GameBoard spawnRequest={spawnRequest} resetSignal={resetSignal} />
        </div>
        <div className="hidden min-h-[28rem] lg:block">
          <Sidebar
            discoveredElements={discoveredElements}
            onSpawnElement={handleSpawnElement}
            onResetBoard={handleResetBoard}
            onResetCache={handleResetCache}
          />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700 bg-slate-900/95 p-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          className="w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white"
        >
          {isDrawerOpen ? 'Close Discoveries' : 'Open Discoveries'}
        </button>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 lg:hidden" onClick={() => setIsDrawerOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 h-[72vh] rounded-t-2xl border border-slate-700 bg-slate-900 p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar
              discoveredElements={discoveredElements}
              onSpawnElement={(element) => {
                handleSpawnElement(element)
                setIsDrawerOpen(false)
              }}
              onResetBoard={() => {
                handleResetBoard()
                setIsDrawerOpen(false)
              }}
              onResetCache={() => {
                handleResetCache()
                setIsDrawerOpen(false)
              }}
              className="h-full border-none bg-transparent p-1 shadow-none"
            />
          </div>
        </div>
      )}
    </main>
  )
}

export default App
