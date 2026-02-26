import { useCallback } from 'react'
import { X, Zap, Clock, Database, Cpu, FlaskConical, BookOpen, ArrowRight } from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'
import { EXAMPLE_CIRCUITS } from '../../utils/projectIO'

const FEATURES = [
    { icon: <Zap size={16} color="#facc15" />, label: 'Real-time simulation', desc: 'Signals propagate instantly as you build' },
    { icon: <Clock size={16} color="#c084fc" />, label: 'Sequential circuits', desc: 'Flip-flops, counters, shift registers + timing diagram' },
    { icon: <Database size={16} color="#38bdf8" />, label: 'Memory components', desc: 'ROM, RAM, Stacks, FIFOs with hex editor' },
    { icon: <Cpu size={16} color="#f43f5e" />, label: '4-bit CPU', desc: 'Programmable processor with debugger & assembler' },
    { icon: <FlaskConical size={16} color="#34d399" />, label: 'ALU & Math units', desc: 'ADD/SUB/AND/OR/... with carry & flag outputs' },
    { icon: <BookOpen size={16} color="#fb923c" />, label: 'Truth tables', desc: 'Auto-generated for every gate and component' },
]

export function WelcomeModal() {
    const { setShowWelcome, loadExampleCircuit } = useCircuitStore()

    const handleExample = useCallback((idx: number) => {
        loadExampleCircuit(idx)
        setShowWelcome(false)
    }, [loadExampleCircuit, setShowWelcome])

    const handleClose = useCallback(() => {
        setShowWelcome(false)
    }, [setShowWelcome])

    return (
        <>
            <div onClick={handleClose}
                style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            />
            <div style={{
                position: 'fixed', zIndex: 2001, top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 640, maxHeight: '88vh',
                background: 'var(--bg-surface)', border: '1px solid rgba(0,212,255,0.25)',
                borderRadius: 16,
                boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,212,255,0.12)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Hero header */}
                <div style={{
                    padding: '28px 28px 20px',
                    background: 'linear-gradient(135deg, #000d18 0%, #001a2e 50%, #000d18 100%)',
                    borderBottom: '1px solid rgba(0,212,255,0.15)',
                    position: 'relative',
                }}>
                    <button onClick={handleClose}
                        style={{ position: 'absolute', right: 16, top: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                        <X size={18} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'linear-gradient(135deg, #00d4ff44, #00d4ff11)',
                            border: '1px solid rgba(0,212,255,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 24,
                        }}>⚡</div>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, background: 'linear-gradient(90deg, #00d4ff, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Logic Gates Simulator
                            </h1>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                Professional digital circuit design — from logic gates to a working CPU
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Feature grid */}
                    <div>
                        <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
                            What you can build
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {FEATURES.map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                                    <span style={{ flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{f.label}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Start with an example */}
                    <div>
                        <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
                            Start with an example
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {EXAMPLE_CIRCUITS.map((ex, i) => (
                                <button key={i} onClick={() => handleExample(i)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                                        background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                                        borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.12s',
                                        width: '100%',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{ex.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ex.description}</div>
                                    </div>
                                    <ArrowRight size={14} color="var(--accent)" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick tips */}
                    <div style={{ background: 'rgba(0,212,255,0.05)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(0,212,255,0.15)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>💡 Quick tips</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.5 }}>
                            <span>• Drag components from the left panel onto the canvas</span>
                            <span>• Click a node's output pin to drag a wire to an input pin</span>
                            <span>• Toggle inputs by clicking the switch nodes</span>
                            <span>• Press <kbd style={{ fontFamily: 'monospace', background: 'var(--bg-surface-3)', padding: '0 4px', borderRadius: 3, fontSize: 10 }}>Ctrl+S</kbd> to save · <kbd style={{ fontFamily: 'monospace', background: 'var(--bg-surface-3)', padding: '0 4px', borderRadius: 3, fontSize: 10 }}>Ctrl+Z</kbd> to undo</span>
                            <span>• Press <kbd style={{ fontFamily: 'monospace', background: 'var(--bg-surface-3)', padding: '0 4px', borderRadius: 3, fontSize: 10 }}>Space</kbd> to start/stop the clock</span>
                        </div>
                    </div>
                </div>

                {/* CTA footer */}
                <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                    <button onClick={handleClose}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: 8,
                            background: 'linear-gradient(90deg, #00d4ff, #00b4e0)',
                            border: 'none', cursor: 'pointer',
                            fontSize: 14, fontWeight: 700, color: '#000',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                        Start Building <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </>
    )
}
