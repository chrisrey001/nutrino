import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCamera, IconPencil, IconStar } from '@tabler/icons-react'

const DISMISS_THRESHOLD = 140
const VELOCITY_THRESHOLD = 0.5

export default function LogActionSheet({ onClose }) {
  const navigate = useNavigate()

  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)

  const onDragStart = (e) => {
    startY.current = e.touches[0].clientY
    lastY.current = e.touches[0].clientY
    lastTime.current = Date.now()
    setIsDragging(true)
  }
  const onDragMove = (e) => {
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      lastY.current = e.touches[0].clientY
      lastTime.current = Date.now()
      setTranslateY(delta)
    }
  }
  const onDragEnd = () => {
    setIsDragging(false)
    const elapsed = Math.max(16, Date.now() - lastTime.current)
    const velocity = (lastY.current - startY.current) / elapsed
    if (translateY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) onClose()
    else setTranslateY(0)
  }

  const go = (path) => { onClose(); navigate(path) }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-t-3xl"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="touch-none select-none px-4 pt-3 pb-3"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-900">Log Your Meal</p>
        </div>

        <div className="px-4 pb-6">
          <div className="space-y-2">
            <OptionButton
              icon={<IconCamera size={22} stroke={1.5} />}
              title="Take a Photo"
              sub="AI estimates calories & macros — add a note to fine-tune it"
              onClick={() => go('/log?mode=photo')}
            />
            <OptionButton
              icon={<IconPencil size={22} stroke={1.5} />}
              title="Describe Your Meal"
              sub="Type what you ate and let AI estimate it"
              onClick={() => go('/log?mode=text')}
            />
            <OptionButton
              icon={<IconStar size={22} stroke={1.5} />}
              title="Favorites"
              sub="Quick-add a saved meal"
              onClick={() => go('/favorites')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function OptionButton({ icon, title, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 active:bg-gray-100 transition-colors text-left"
    >
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-600 flex-shrink-0 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-gray-900 text-sm font-semibold">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
      </div>
    </button>
  )
}
