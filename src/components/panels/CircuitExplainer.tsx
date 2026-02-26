import { useState, useCallback, useEffect } from 'react'
import { X, BrainCircuit, RefreshCw, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'
import { analyzeCircuit, generateExplanation, type Analysis } from '../../utils/circuitAnalyser'

function StatBadge({ label, value, color = 'var(--accent)' }: { label: string; value: number; color?: string }) {
    if (!value) return null
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: `${color}14`, border: `1px solid ${color}28` }}>
            <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.2 }}>{label}</span>
        </div>
    )
}

export function CircuitExplainer() {
    const { nodes, edges, setShowExplainer } = useCircuitStore()
    const [analysis, setAnalysis] = useState<Analysis | null>(null)
    const [explanation, setExplanation] = useState<string[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    const runAnalysis = useCallback(() => {
        setIsAnalyzing(true)
        setTimeout(() => {
            const a = analyzeCircuit(nodes, edges)
            setAnalysis(a)
            setExplanation(generateExplanation(a))
            setIsAnalyzing(false)
        }, 280)
    }, [nodes, edges])

    useEffect(() => { runAnalysis() }, [])  // auto-analyze on open

    const s = analysis?.summary

    return (
        <>
            <div onClick={() => setShowExplainer(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            />
            <div style={{
                position: 'fixed', zIndex: 1001, top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 520, maxHeight: '82vh',
                background: 'var(--bg-surface)', border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
            }}>
                {/* Header */}
                <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BrainCircuit size={18} color="var(--accent)" />
                            </div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Circuit Analyser</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Static circuit analysis & explanation</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={runAnalysis} disabled={isAnalyzing}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--bg-surface-3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-2)', fontSize: 11 }}>
                                <RefreshCw size={12} style={{ animation: isAnalyzing ? 'spin 0.7s linear infinite' : 'none' }} />
                                {isAnalyzing ? 'Analysing…' : 'Re-analyse'}
                            </button>
                            <button onClick={() => setShowExplainer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!analysis && isAnalyzing && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
                            <RefreshCw size={28} style={{ animation: 'spin 0.7s linear infinite', marginBottom: 12 }} color="var(--accent)" />
                            <div>Analysing circuit…</div>
                        </div>
                    )}

                    {analysis && (
                        <>
                            {/* Stats grid */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                                    Circuit Summary
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    <StatBadge label="Nodes" value={s!.nodeCount} color="var(--accent)" />
                                    <StatBadge label="Wires" value={s!.edgeCount} color="#7c3aed" />
                                    <StatBadge label="Inputs" value={s!.inputCount} color="#00d4ff" />
                                    <StatBadge label="Outputs" value={s!.outputCount} color="#00ff9d" />
                                    <StatBadge label="Gates" value={s!.gateCount} color="#38bdf8" />
                                    <StatBadge label="Combos" value={s!.comboCount} color="#f59e0b" />
                                    <StatBadge label="Sequential" value={s!.seqCount} color="#c084fc" />
                                    <StatBadge label="Memory" value={s!.memCount} color="#fb923c" />
                                    <StatBadge label="ALU" value={s!.aluCount} color="#4ade80" />
                                    <StatBadge label="CPU" value={s!.cpuCount} color="#f43f5e" />
                                </div>

                                {/* Complexity badge */}
                                <div style={{
                                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                                    background: s!.complexity === 'simple' ? 'rgba(16,185,129,0.15)' : s!.complexity === 'moderate' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: s!.complexity === 'simple' ? '#10b981' : s!.complexity === 'moderate' ? '#f59e0b' : '#ef4444',
                                    border: `1px solid currentColor`,
                                }}>
                                    <Zap size={9} /> {s!.complexity} circuit
                                </div>
                            </div>

                            {/* Gate frequency */}
                            {Object.keys(analysis.gateFreq).length > 0 && (
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Gate Breakdown</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {Object.entries(analysis.gateFreq).map(([g, c]) => (
                                            <div key={g} style={{ padding: '3px 8px', borderRadius: 4, background: 'var(--bg-surface-3)', border: '1px solid var(--border-hi)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-1)', fontWeight: 600 }}>
                                                {c > 1 ? `${c}× ` : ''}{g}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Detected patterns */}
                            {analysis.patterns.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Detected Patterns</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {analysis.patterns.map((p, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
                                                <CheckCircle size={12} color="var(--accent)" />
                                                <span style={{ fontSize: 12, color: 'var(--text-1)' }}>{p}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Explanation */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                                    Explanation
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {explanation.map((para, i) => {
                                        const isWarning = para.startsWith('⚠')
                                        return (
                                            <div key={i} style={{
                                                padding: '10px 12px', borderRadius: 7, lineHeight: 1.55,
                                                background: isWarning ? 'rgba(245,158,11,0.06)' : 'var(--bg-surface-2)',
                                                border: `1px solid ${isWarning ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
                                                fontSize: 12, color: isWarning ? '#f59e0b' : 'var(--text-1)',
                                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                            }}>
                                                {isWarning
                                                    ? <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                                                    : <span style={{ fontSize: 14, flexShrink: 0 }}>{i === 0 ? '📊' : i === 1 ? '🔌' : i === 2 ? '⚙️' : '🔍'}</span>
                                                }
                                                {para.replace(/^⚠\s*/, '')}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
