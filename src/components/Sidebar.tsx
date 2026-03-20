import { useMemo, useState } from 'react'
import type { Element } from '../types'

type SidebarProps = {
  discoveredElements: Element[]
  onSpawnElement: (element: Element) => void
  onResetBoard: () => void
  onResetCache: () => void
  className?: string
}

export function Sidebar({
  discoveredElements,
  onSpawnElement,
  onResetBoard,
  onResetCache,
  className,
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () =>
      [...discoveredElements]
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter((element) => element.name.toLowerCase().includes(query.trim().toLowerCase())),
    [discoveredElements, query],
  )

  return (
    <aside
      className={`flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-xl shadow-black/20 ${className ?? ''}`}
    >
      <h2 className="text-lg font-semibold text-slate-100">🔬 {discoveredElements.length} elements discovered</h2>

      <div className="mt-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search elements..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400"
        />
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
        {filtered.map((element) => (
          <button
            key={element.id}
            type="button"
            onClick={() => onSpawnElement(element)}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-slate-500"
          >
            <span className="text-lg" aria-hidden="true">
              {element.emoji}
            </span>
            <span>{element.name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-sm text-slate-400">
            No matching elements found.
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onResetBoard}
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 hover:border-rose-400"
        >
          Reset board
        </button>
        <button
          type="button"
          onClick={onResetCache}
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:border-amber-400"
        >
          Reset cache
        </button>
      </div>
    </aside>
  )
}
