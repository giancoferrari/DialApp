import { createContext, useContext, useState, useCallback, useRef } from 'react'
import Portal from './Portal'
import { CheckIcon, CloseIcon } from './Icons'
import { font } from '../lib/tokens'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

const ToastCtx = createContext<(message: string, type?: ToastType) => void>(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

const STYLES: Record<ToastType, { bg: string; fg: string }> = {
  success: { bg: 'var(--toast-bg)',       fg: 'var(--toast-fg)' },
  error:   { bg: 'var(--toast-bg-error)', fg: 'var(--toast-fg)' },
  info:    { bg: 'var(--toast-bg)',       fg: 'var(--toast-fg)' },
}

function ToastCard({ message, type }: ToastItem) {
  const s = STYLES[type]
  return (
    <div style={{
      pointerEvents: 'auto',
      display: 'flex', alignItems: 'center', gap: 9,
      background: s.bg, color: s.fg,
      backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      borderRadius: 12, padding: '11px 16px',
      fontFamily: font.body, fontSize: 13, fontWeight: 500,
      maxWidth: 420, boxShadow: 'var(--toast-shadow)',
      animation: 'toastIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {type === 'error'
          ? <CloseIcon size={13} color="var(--toast-fg)" />
          : <CheckIcon size={13} color="var(--toast-accent)" />}
      </span>
      <span style={{ lineHeight: 1.35 }}>{message}</span>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <Portal>
        <div style={{
          position: 'fixed', left: 0, right: 0,
          bottom: 'calc(env(safe-area-inset-bottom) + 96px)',
          zIndex: 400, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8, padding: '0 16px', pointerEvents: 'none',
        }}>
          {toasts.map(t => <ToastCard key={t.id} {...t} />)}
        </div>
      </Portal>
    </ToastCtx.Provider>
  )
}
