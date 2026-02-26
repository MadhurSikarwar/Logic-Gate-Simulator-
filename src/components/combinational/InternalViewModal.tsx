import { X, Cpu, GitBranch, Code2, Table2, Info } from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'
import { COMBO_DEFS } from '../../engine/combinationalLogic'
import type { ComboNodeData } from './ComboNode'

export function InternalViewModal() {
    const { nodes, internalViewId, setInternalViewId } = useCircuitStore()
    const node = nodes.find((n) => n.id === internalViewId)
    const d = node?.data as ComboNodeData | undefined
    if (!d) return null

    const def = COMBO_DEFS[d.componentType]
    if (!def) return null

    const inputs = d.inputValues ?? []
    const outputs = d.outputValues ?? []

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={() => setInternalViewId(null)}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fade-in 0.15s ease',
                }}
            />

            {/* Modal */}
            <div
                className="anim-up"
                style={{
                    position: 'fixed', zIndex: 1001,
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 520,
                    maxHeight: '85vh',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-hi)',
                    borderRadius: 12,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderBottom: '1px solid var(--border)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg, var(--accent) 0%, #0066ff 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: 'var(--accent-glow)',
                        }}>
                            <Cpu size={16} color="#000" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
                                {def.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                                {def.inputs.length} inputs · {def.outputs.length} outputs · {def.category}
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => setInternalViewId(null)}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ overflow: 'auto', flex: 1 }}>
                    {/* Description */}
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            <Info size={12} color="var(--accent)" /> Description
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{def.description}</p>
                    </div>

                    {/* Internal wiring */}
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            <GitBranch size={12} color="var(--accent)" /> Internal Structure
                        </div>
                        <div style={{
                            padding: '8px 12px', background: 'var(--bg-surface-3)',
                            border: '1px solid var(--border)', borderRadius: 6,
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                            color: 'var(--accent)',
                        }}>
                            {def.internals}
                        </div>
                    </div>

                    {/* Boolean Expressions */}
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            <Code2 size={12} color="var(--accent)" /> Boolean Expressions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {def.outputs.map((out, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 10px', background: 'var(--bg-surface-3)',
                                    borderRadius: 5, fontSize: 13,
                                }}>
                                    <span style={{ color: 'var(--text-2)', minWidth: 40 }}>{out} =</span>
                                    <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {def.boolExprs[i] ?? '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Current I/O State */}
                    <div style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            <Table2 size={12} color="var(--accent)" /> Current State
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {/* Inputs */}
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4, letterSpacing: '0.06em' }}>INPUTS</div>
                                {def.inputs.map((label, i) => {
                                    const val = inputs[i] ?? 0
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, marginBottom: 2 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{label}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: val === 1 ? '#00ff9d' : 'var(--text-3)' }}>{val}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Outputs */}
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4, letterSpacing: '0.06em' }}>OUTPUTS</div>
                                {def.outputs.map((label, i) => {
                                    const val = outputs[i] ?? 0
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, marginBottom: 2, background: val === 1 ? 'rgba(0,255,157,0.08)' : undefined }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{label}</span>
                                            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: val === 1 ? '#00ff9d' : 'var(--text-3)' }}>{val}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
                    Node ID: <kbd className="kbd">{node?.id}</kbd>
                    <span style={{ marginLeft: 12 }}>Press <kbd className="kbd">Esc</kbd> to close</span>
                </div>
            </div>
        </>
    )
}
