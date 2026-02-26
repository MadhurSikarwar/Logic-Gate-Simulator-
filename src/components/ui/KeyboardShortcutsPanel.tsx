import { X, Keyboard } from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'

const SHORTCUTS = [
    { section: 'General' },
    { key: '?', desc: 'Toggle keyboard shortcuts' },
    { key: 'Ctrl+S', desc: 'Save project' },
    { key: 'Ctrl+Z', desc: 'Undo' },
    { key: 'Ctrl+Y', desc: 'Redo' },
    { key: 'Ctrl+B', desc: 'Toggle left panel' },
    { key: 'Ctrl+J', desc: 'Toggle right panel' },
    { section: 'Canvas' },
    { key: 'Scroll', desc: 'Zoom in / out' },
    { key: 'Middle drag', desc: 'Pan canvas' },
    { key: 'Delete', desc: 'Delete selected' },
    { key: 'Shift+Click', desc: 'Multi-select' },
    { key: 'Ctrl+A', desc: 'Select all' },
    { section: 'Editor Modes' },
    { key: '1', desc: 'Select mode' },
    { key: '2', desc: 'Connect mode' },
    { key: '3', desc: 'Pan mode' },
    { key: 'Escape', desc: 'Return to select mode' },
]

export function KeyboardShortcutsPanel() {
    const { toggleShortcuts } = useCircuitStore()

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={toggleShortcuts}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fade-in 0.15s ease',
                }}
            />

            {/* Panel */}
            <div
                className="anim-up"
                style={{
                    position: 'fixed',
                    zIndex: 1001,
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 480,
                    maxHeight: '80vh',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-hi)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderBottom: '1px solid var(--border)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Keyboard size={17} color="var(--accent)" />
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>
                            Keyboard Shortcuts
                        </span>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={toggleShortcuts}>
                        <X size={16} />
                    </button>
                </div>

                {/* Shortcuts list */}
                <div style={{ overflow: 'auto', padding: '8px 0' }}>
                    {SHORTCUTS.map((item, i) =>
                        'section' in item ? (
                            <div
                                key={i}
                                style={{
                                    padding: '12px 18px 6px',
                                    fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.09em', textTransform: 'uppercase',
                                    color: 'var(--accent)',
                                }}
                            >
                                {item.section}
                            </div>
                        ) : (
                            <div
                                key={i}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '7px 18px',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)')}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = '')}
                            >
                                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.desc}</span>
                                <kbd className="kbd">{item.key}</kbd>
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '10px 18px',
                        borderTop: '1px solid var(--border)',
                        fontSize: 11, color: 'var(--text-3)',
                        textAlign: 'center',
                    }}
                >
                    Press <kbd className="kbd">?</kbd> or <kbd className="kbd">Escape</kbd> to close
                </div>
            </div>
        </>
    )
}
