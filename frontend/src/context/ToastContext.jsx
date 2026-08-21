import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useAudio } from '../hooks/useAudio'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [audioEnabled, setAudioEnabled] = useState(true)
  const { playTone } = useAudio(audioEnabled)

  const showToast = useCallback((title, message, type = 'info', duration = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)
    
    setToasts((prev) => [...prev, { id, title, message, type }])

    if (type === 'success') playTone('success')
    if (type === 'receive') playTone('receive')
    if (type === 'error') playTone('error')

    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [playTone])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => !prev)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, audioEnabled, toggleAudio }}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const typeColors = {
            success: 'border-brand-primary/40 bg-base-surface/95 text-white',
            error: 'border-accent-rose/40 bg-base-surface/95 text-white',
            warning: 'border-accent-gold/40 bg-base-surface/95 text-white',
            info: 'border-accent-cyan/40 bg-base-surface/95 text-white',
          }[toast.type] || 'border-white/10 bg-base-surface/95 text-white'

          const IconComponent = {
            success: <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-accent-rose shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-accent-gold shrink-0" />,
            info: <Info className="w-5 h-5 text-accent-cyan shrink-0" />,
          }[toast.type] || <Info className="w-5 h-5 text-accent-cyan shrink-0" />

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all duration-300 transform translate-y-0 animate-fade-in ${typeColors}`}
            >
              <div className="mt-0.5">{IconComponent}</div>
              <div className="flex-1">
                <div className="font-heading font-bold text-sm leading-tight">{toast.title}</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-snug">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-500 hover:text-white p-0.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
