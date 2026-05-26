import { createContext, useContext, useState, useRef, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const show = useCallback((message, { actionLabel, onAction } = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, actionLabel, onAction })
    const delay = actionLabel ? 6000 : 3500
    timerRef.current = setTimeout(() => setToast(null), delay)
  }, [])

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
            <span className="text-sm flex-1">{toast.message}</span>
            {toast.actionLabel && (
              <button
                onClick={() => { dismiss(); toast.onAction?.() }}
                className="text-green-400 text-sm font-semibold flex-shrink-0 active:opacity-70"
              >
                {toast.actionLabel}
              </button>
            )}
            <button onClick={dismiss} className="text-gray-400 flex-shrink-0 active:opacity-70">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
