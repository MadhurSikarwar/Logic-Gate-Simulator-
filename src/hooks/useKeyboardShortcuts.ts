import { useEffect, useCallback } from 'react'
import { useCircuitStore } from '../store/circuitStore'

/** Returns true when the keyboard event target is editable (input, textarea, contenteditable) */
function isEditable(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false
    const tag = target.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    if (target.isContentEditable) return true
    return false
}

export function useKeyboardShortcuts() {
    const store = useCircuitStore()

    const handler = useCallback(
        (e: KeyboardEvent) => {
            // Never intercept when user is typing
            if (isEditable(e.target)) return

            const ctrl = e.ctrlKey || e.metaKey
            const shift = e.shiftKey

            // ─── Undo / Redo ──────────────────────────────────────────────────────
            if (ctrl && !shift && e.key.toLowerCase() === 'z') {
                e.preventDefault(); store.undo(); return
            }
            if ((ctrl && e.key.toLowerCase() === 'y') || (ctrl && shift && e.key.toLowerCase() === 'z')) {
                e.preventDefault(); store.redo(); return
            }

            // ─── Save / Open / New ───────────────────────────────────────────────
            if (ctrl && e.key.toLowerCase() === 's') {
                e.preventDefault(); store.saveProject(); return
            }
            if (ctrl && e.key.toLowerCase() === 'o') {
                e.preventDefault(); store.openProject(); return
            }
            if (ctrl && e.key.toLowerCase() === 'n') {
                e.preventDefault()
                if (store.isDirty) {
                    if (confirm('Start a new project? Unsaved changes will be lost.')) store.newProject()
                } else {
                    store.newProject()
                }
                return
            }

            // ─── Panels ──────────────────────────────────────────────────────────
            if (ctrl && e.key.toLowerCase() === 'b') {
                e.preventDefault(); store.toggleLeftPanel(); return
            }
            if (ctrl && e.key.toLowerCase() === 't') {
                e.preventDefault(); store.toggleTiming(); return
            }
            if (ctrl && e.key.toLowerCase() === 'd') {
                e.preventDefault(); store.toggleDelayMode(); return
            }

            // ─── Clock ───────────────────────────────────────────────────────────
            if (!ctrl && e.key === ' ') {
                e.preventDefault(); store.toggleClock(); return
            }

            // ─── Escape — close panels ────────────────────────────────────────────
            if (e.key === 'Escape') {
                if (store.shortcutsOpen) { store.toggleShortcuts(); return }
                if (store.memViewerId) { store.setMemViewerId(null); return }
                if (store.cpuPanelId) { store.setCpuPanelId(null); return }
                if (store.internalViewId) { store.setInternalViewId(null); return }
            }

            // ─── Help ─────────────────────────────────────────────────────────────
            if (e.key === 'F1' || (ctrl && e.key.toLowerCase() === '/')) {
                e.preventDefault(); store.toggleShortcuts(); return
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [store]
    )

    useEffect(() => {
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handler])
}
