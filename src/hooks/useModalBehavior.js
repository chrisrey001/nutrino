import { useEffect, useRef } from 'react'

export function useModalBehavior(onClose) {
  const sheetRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    sheetRef.current?.focus()

    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return sheetRef
}
