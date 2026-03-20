import type { Element } from '../types'
import type { DragEvent } from 'react'

type ElementCardProps = {
  element: Element
  className?: string
  draggable?: boolean
  isCombining?: boolean
  isNew?: boolean
  instanceId?: string
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
}

export function ElementCard({
  element,
  className,
  draggable = true,
  isCombining = false,
  isNew = false,
  instanceId,
  onDragStart,
  onDrop,
  onDragOver,
}: ElementCardProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', element.id)
    if (instanceId) {
      event.dataTransfer.setData('application/x-element-instance-id', instanceId)
    }
    onDragStart?.(event)
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`relative flex w-28 cursor-grab flex-col items-center gap-1 rounded-xl border border-slate-600 bg-slate-800/90 px-3 py-2 text-center shadow-lg shadow-black/20 transition hover:border-slate-400 ${className ?? ''}`}
    >
      <span className="text-3xl" aria-hidden="true">
        {element.emoji}
      </span>
      <span className="text-sm font-semibold text-slate-100">{element.name}</span>
      {isCombining && (
        <span className="absolute -right-2 -top-2 inline-flex h-6 w-6 animate-spin items-center justify-center rounded-full border-2 border-indigo-300 border-t-transparent bg-slate-900" />
      )}
      {isNew && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow-sm">
          New!
        </span>
      )}
    </div>
  )
}
