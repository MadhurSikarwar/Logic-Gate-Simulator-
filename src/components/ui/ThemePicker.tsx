import { useCallback } from 'react'
import { useCircuitStore, type Theme } from '../../store/circuitStore'

interface ThemeDef {
    id: Theme
    label: string
    desc: string
    preview: React.ReactNode
}

const THEMES: ThemeDef[] = [
    {
        id: 'dark',
        label: 'Default Dark',
        desc: 'Deep navy + cyan',
        preview: (
            <svg width="48" height="28" viewBox="0 0 48 28">
                <rect width="48" height="28" fill="#070b0f" rx="3" />
                <rect x="4" y="4" width="18" height="8" fill="#0c1118" stroke="#00d4ff" strokeWidth="0.8" rx="2" />
                <line x1="22" y1="8" x2="32" y2="8" stroke="#2d4060" strokeWidth="1.2" />
                <rect x="32" y="4" width="12" height="8" fill="#0c1118" stroke="#00d4ff" strokeWidth="0.8" rx="2" />
                <circle cx="38" cy="8" r="2" fill="#00ff9d" />
            </svg>
        ),
    },
    {
        id: 'light',
        label: 'Light',
        desc: 'Bright workspace',
        preview: (
            <svg width="48" height="28" viewBox="0 0 48 28">
                <rect width="48" height="28" fill="#eef2f8" rx="3" />
                <rect x="4" y="4" width="18" height="8" fill="#ffffff" stroke="#0891b2" strokeWidth="0.8" rx="2" />
                <line x1="22" y1="8" x2="32" y2="8" stroke="#94a3b8" strokeWidth="1.2" />
                <rect x="32" y="4" width="12" height="8" fill="#ffffff" stroke="#0891b2" strokeWidth="0.8" rx="2" />
                <circle cx="38" cy="8" r="2" fill="#059669" />
            </svg>
        ),
    },
    {
        id: 'cyberpunk',
        label: 'Cyberpunk',
        desc: 'Magenta neon + deep purple',
        preview: (
            <svg width="48" height="28" viewBox="0 0 48 28">
                <rect width="48" height="28" fill="#0a0010" rx="3" />
                <rect x="4" y="4" width="18" height="8" fill="#1a0028" stroke="#ff00ff" strokeWidth="0.8" rx="2" />
                <line x1="22" y1="8" x2="32" y2="8" stroke="#ff00ff" strokeWidth="1.2" strokeDasharray="3 2" />
                <rect x="32" y="4" width="12" height="8" fill="#1a0028" stroke="#ff00ff" strokeWidth="0.8" rx="2" />
                <circle cx="38" cy="8" r="2" fill="#facc15" />
            </svg>
        ),
    },
    {
        id: 'blueprint',
        label: 'Blueprint',
        desc: 'Engineering drawing style',
        preview: (
            <svg width="48" height="28" viewBox="0 0 48 28">
                <rect width="48" height="28" fill="#003070" rx="3" />
                <line x1="0" y1="7" x2="48" y2="7" stroke="#4080c0" strokeWidth="0.3" />
                <line x1="0" y1="14" x2="48" y2="14" stroke="#4080c0" strokeWidth="0.3" />
                <line x1="0" y1="21" x2="48" y2="21" stroke="#4080c0" strokeWidth="0.3" />
                <rect x="4" y="4" width="18" height="8" fill="none" stroke="#c8dfff" strokeWidth="0.8" rx="1.5" />
                <line x1="22" y1="8" x2="32" y2="8" stroke="#c8dfff" strokeWidth="1" />
                <rect x="32" y="4" width="12" height="8" fill="none" stroke="#c8dfff" strokeWidth="0.8" rx="1.5" />
                <circle cx="38" cy="8" r="2" fill="none" stroke="#7ef" strokeWidth="1" />
            </svg>
        ),
    },
    {
        id: 'pcb',
        label: 'Classic PCB',
        desc: 'Green board + copper traces',
        preview: (
            <svg width="48" height="28" viewBox="0 0 48 28">
                <rect width="48" height="28" fill="#0a2210" rx="3" />
                <rect x="4" y="4" width="18" height="8" fill="#0d2e15" stroke="#3dc45c" strokeWidth="0.8" rx="2" />
                <line x1="22" y1="8" x2="32" y2="8" stroke="#b87333" strokeWidth="1.5" />
                <rect x="32" y="4" width="12" height="8" fill="#0d2e15" stroke="#3dc45c" strokeWidth="0.8" rx="2" />
                <circle cx="38" cy="8" r="2.5" fill="#b87333" />
                <circle cx="38" cy="8" r="1" fill="#c8a060" />
            </svg>
        ),
    },
]

export function ThemePicker({ onClose }: { onClose: () => void }) {
    const { theme, setTheme } = useCircuitStore()

    const handleSelect = useCallback((t: Theme) => {
        setTheme(t)
        onClose()
    }, [setTheme, onClose])

    return (
        <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 2000,
            background: 'var(--bg-surface)', border: '1px solid var(--border-hi)',
            borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            padding: 10, minWidth: 200,
        }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, paddingLeft: 4 }}>
                Visual Theme
            </div>
            {THEMES.map((t) => (
                <button key={t.id} onClick={() => handleSelect(t.id)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '7px 8px', borderRadius: 7, background: 'none',
                        border: theme === t.id ? '1px solid var(--accent)' : '1px solid transparent',
                        cursor: 'pointer', textAlign: 'left',
                        backgroundColor: theme === t.id ? 'var(--accent-dim)' : 'transparent',
                        transition: 'all 0.12s',
                    }}
                    onMouseEnter={(e) => { if (theme !== t.id) e.currentTarget.style.background = 'var(--bg-surface-3)' }}
                    onMouseLeave={(e) => { if (theme !== t.id) e.currentTarget.style.background = 'transparent' }}>
                    <div style={{ borderRadius: 4, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                        {t.preview}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: theme === t.id ? 'var(--accent)' : 'var(--text-1)' }}>
                            {t.label}
                            {theme === t.id && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent)' }}>●</span>}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t.desc}</div>
                    </div>
                </button>
            ))}
        </div>
    )
}
