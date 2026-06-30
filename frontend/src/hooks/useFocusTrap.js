import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Atrapa el foco dentro de un elemento modal mientras está montado.
 * Al desmontar, devuelve el foco al elemento que lo invocó.
 */
export function useFocusTrap(active = true) {
  const ref = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!active) return

    // Guardar el elemento que tenía foco antes
    triggerRef.current = document.activeElement

    const el = ref.current
    if (!el) return

    // Dar foco al primer elemento focusable del modal
    const focusables = [...el.querySelectorAll(FOCUSABLE)]
    if (focusables.length > 0) focusables[0].focus()

    const handleKey = (e) => {
      if (e.key !== 'Tab') return
      const items = [...el.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return

      const first = items[0]
      const last  = items[items.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }

    el.addEventListener('keydown', handleKey)
    return () => {
      el.removeEventListener('keydown', handleKey)
      // Devolver foco al elemento que abrió el modal
      triggerRef.current?.focus?.()
    }
  }, [active])

  return ref
}
