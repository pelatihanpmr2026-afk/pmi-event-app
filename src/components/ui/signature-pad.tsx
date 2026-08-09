'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const hasDrawnRef = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    ctx.scale(ratio, ratio)
    ctx.strokeStyle = '#3653A5'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    isDrawing.current = true
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasDrawnRef.current = true
  }

  function handlePointerUp() {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (hasDrawnRef.current) {
      setIsEmpty(false)
      onChange(canvasRef.current!.toDataURL('image/png'))
    }
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
    setIsEmpty(true)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="border-3 border-event-navy bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-body text-[11px] text-event-navy/50">
          {isEmpty ? 'Gambar tanda tangan di atas (opsional)' : 'Tanda tangan tersimpan'}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-event-navy font-body font-bold text-[11px] text-event-navy hover:bg-event-cream"
        >
          <Eraser size={11} />
          Hapus
        </button>
      </div>
    </div>
  )
}