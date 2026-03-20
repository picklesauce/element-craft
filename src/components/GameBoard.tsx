import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { combineElements } from '../api'
import { useStore } from '../store'
import type { Element } from '../types'
import { ElementCard } from './ElementCard'

type BoardElement = {
  instanceId: string
  element: Element
  x: number
  y: number
  isEntering: boolean
  showNewBadge: boolean
}

type SpawnRequest = {
  requestId: number
  element: Element
}
type GameBoardProps = {
  spawnRequest: SpawnRequest | null
  resetSignal: number
}
type ParticleBurst = {
  id: string
  x: number
  y: number
}

const COMBINE_DISTANCE = 60

const uuid = () => crypto.randomUUID()
const normalizeName = (value: string) => value.trim().toLowerCase()

export function GameBoard({ spawnRequest, resetSignal }: GameBoardProps) {
  const elements = useStore((state) => state.elements)
  const discoveries = useStore((state) => state.discoveries)
  const [boardElements, setBoardElements] = useState<BoardElement[]>([])
  const [combiningIds, setCombiningIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [bursts, setBursts] = useState<ParticleBurst[]>([])
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const boardElementsRef = useRef<BoardElement[]>([])
  const timeoutIdsRef = useRef<number[]>([])

  useEffect(() => {
    boardElementsRef.current = boardElements
  }, [boardElements])

  useEffect(
    () => () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id))
    },
    [],
  )

  useEffect(() => {
    if (resetSignal === 0) {
      return
    }
    setBoardElements([])
    setCombiningIds(new Set())
    setError(null)
  }, [resetSignal])

  useEffect(() => {
    if (!spawnRequest) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const x = canvas.clientWidth / 2 + (Math.random() - 0.5) * 120
    const y = canvas.clientHeight / 2 + (Math.random() - 0.5) * 120

    setBoardElements((prev) => [
      ...prev,
      {
        instanceId: uuid(),
        element: spawnRequest.element,
        x,
        y,
        isEntering: false,
        showNewBadge: false,
      },
    ])
  }, [spawnRequest])

  const discoveredElements = elements.filter((element) => discoveries.has(normalizeName(element.name)))

  const trackTimeout = (timeoutId: number) => {
    timeoutIdsRef.current.push(timeoutId)
  }

  const showToast = (message: string) => {
    setToast(message)
    trackTimeout(
      window.setTimeout(() => {
        setToast(null)
      }, 1500),
    )
  }

  const setElementBadgeState = (
    instanceId: string,
    patch: Pick<BoardElement, 'isEntering' | 'showNewBadge'>,
  ) => {
    setBoardElements((prev) =>
      prev.map((item) => (item.instanceId === instanceId ? { ...item, ...patch } : item)),
    )
  }

  const combineInstances = async (sourceInstanceId: string, targetInstanceId: string) => {
    if (sourceInstanceId === targetInstanceId || combiningIds.size > 0) {
      return
    }

    const source = boardElementsRef.current.find((item) => item.instanceId === sourceInstanceId)
    const target = boardElementsRef.current.find((item) => item.instanceId === targetInstanceId)
    if (!source || !target) {
      return
    }

    const knownNamesBefore = new Set(discoveries)
    const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }
    const cachedResult = useStore.getState().getCombination(source.element.name, target.element.name)

    if (cachedResult) {
      showToast('Already found!')
      return
    }

    setCombiningIds(new Set([sourceInstanceId, targetInstanceId]))
    setError(null)

    try {
      const result = await combineElements(source.element.name, target.element.name)
      const alreadyDiscovered = knownNamesBefore.has(normalizeName(result.name))
      const newInstanceId = uuid()
      const boardResult: BoardElement = {
        instanceId: newInstanceId,
        element: { ...result, isNew: !alreadyDiscovered },
        x: midpoint.x,
        y: midpoint.y,
        isEntering: true,
        showNewBadge: !alreadyDiscovered,
      }

      setBoardElements((prev) => [
        ...prev.filter(
          (item) => item.instanceId !== sourceInstanceId && item.instanceId !== targetInstanceId,
        ),
        boardResult,
      ])
      const burstId = uuid()
      setBursts((prev) => [...prev, { id: burstId, x: midpoint.x, y: midpoint.y }])
      trackTimeout(
        window.setTimeout(() => {
          setBursts((prev) => prev.filter((item) => item.id !== burstId))
        }, 700),
      )

      trackTimeout(
        window.setTimeout(() => {
          setElementBadgeState(newInstanceId, {
            isEntering: false,
            showNewBadge: !alreadyDiscovered,
          })
        }, 350),
      )

      if (!alreadyDiscovered) {
        trackTimeout(
          window.setTimeout(() => {
            setElementBadgeState(newInstanceId, { isEntering: false, showNewBadge: false })
          }, 2000),
        )
      }
    } catch {
      setError('Failed to combine these elements right now.')
    } finally {
      setCombiningIds(new Set())
    }
  }

  const getDropPoint = (event: DragEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const onCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const dropPoint = getDropPoint(event)
    if (!dropPoint) {
      return
    }

    const elementId = event.dataTransfer.getData('text/plain')
    const draggedInstanceId = event.dataTransfer.getData('application/x-element-instance-id')
    const draggedElement = elements.find((item) => item.id === elementId)
    if (!draggedElement) {
      return
    }

    if (!draggedInstanceId) {
      setBoardElements((prev) => [
        ...prev,
        {
          instanceId: uuid(),
          element: draggedElement,
          x: dropPoint.x,
          y: dropPoint.y,
          isEntering: false,
          showNewBadge: false,
        },
      ])
      return
    }

    const potentialTarget = boardElementsRef.current
      .filter((item) => item.instanceId !== draggedInstanceId)
      .find((item) => Math.hypot(item.x - dropPoint.x, item.y - dropPoint.y) <= COMBINE_DISTANCE)

    if (potentialTarget) {
      void combineInstances(draggedInstanceId, potentialTarget.instanceId)
      return
    }

    setBoardElements((prev) =>
      prev.map((item) =>
        item.instanceId === draggedInstanceId ? { ...item, x: dropPoint.x, y: dropPoint.y } : item,
      ),
    )
  }

  const onCardDrop = (targetInstanceId: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const draggedInstanceId = event.dataTransfer.getData('application/x-element-instance-id')
    if (!draggedInstanceId || draggedInstanceId === targetInstanceId) {
      return
    }
    void combineInstances(draggedInstanceId, targetInstanceId)
  }

  const removeInstance = (instanceId: string) => {
    setBoardElements((prev) => prev.filter((item) => item.instanceId !== instanceId))
  }

  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-xl shadow-black/20">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Element Board</h2>
        <p className="text-sm text-slate-300">
          Drag elements into the canvas, then drop one on top of another to combine.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {discoveredElements.map((element) => (
          <ElementCard key={element.id} element={element} />
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-400/50 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div
        ref={canvasRef}
        onDrop={onCanvasDrop}
        onDragOver={(event) => event.preventDefault()}
        className="relative min-h-[24rem] flex-1 overflow-hidden rounded-xl border border-dashed border-slate-600 bg-slate-950/70"
      >
        {boardElements.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">
            Drop elements here to start crafting.
          </div>
        )}

        {boardElements.map((item) => (
          <div
            key={item.instanceId}
            className="absolute"
            style={{ left: item.x, top: item.y, transform: 'translate(-50%, -50%)' }}
            onDoubleClick={() => removeInstance(item.instanceId)}
          >
            <ElementCard
              element={item.element}
              instanceId={item.instanceId}
              isCombining={combiningIds.has(item.instanceId)}
              isNew={item.showNewBadge}
              className={item.isEntering ? 'element-pop-in' : ''}
              onDrop={onCardDrop(item.instanceId)}
              onDragOver={(event) => event.preventDefault()}
            />
          </div>
        ))}

        {bursts.map((burst) => (
          <div
            key={burst.id}
            className="pointer-events-none absolute"
            style={{ left: burst.x, top: burst.y, transform: 'translate(-50%, -50%)' }}
          >
            <div className="particle-burst">
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={index}
                  className="particle-dot"
                  style={{ '--i': index } as CSSProperties}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-amber-300 shadow-lg shadow-black/30">
          {toast}
        </div>
      )}
    </section>
  )
}

export type { SpawnRequest }
