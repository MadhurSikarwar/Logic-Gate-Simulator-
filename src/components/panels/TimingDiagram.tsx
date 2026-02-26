import { X, Activity, Waves } from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'
import type { SeqNodeData } from '../sequential/SeqNode'

const TICK_W = 18         // pixels per tick
const SIG_H = 28          // row height per signal
const WAVE_H = 18         // inner waveform height
const MAX_TICKS = 32

interface TimingRow {
    id: string
    label: string
    values: (0 | 1)[]
}

export function TimingDiagram() {
    const { nodes, timingData, timingTick, toggleTiming } = useCircuitStore()

    // Build rows from timing data
    const rows: TimingRow[] = []

    // Include Clock nodes
    nodes
        .filter((n) => (n.data as Record<string, unknown>)?.gateType === 'CLOCK')
        .forEach((n) => {
            const history = timingData.get(n.id) ?? []
            rows.push({ id: n.id, label: `CLK (${n.id})`, values: history.slice(-MAX_TICKS) })
        })

    // Include sequential nodes Q outputs
    nodes
        .filter((n) => n.type === 'seqNode')
        .forEach((n) => {
            const d = n.data as SeqNodeData
            const history = timingData.get(n.id) ?? []
            const label = `${d.seqType} Q`
            rows.push({ id: n.id, label, values: history.slice(-MAX_TICKS) })
        })

    const numTicks = Math.max(1, ...rows.map((r) => r.values.length))
    const svgW = numTicks * TICK_W + 4
    const totalH = rows.length * SIG_H + 40

    return (
        <div style={{
            position: 'absolute',
            bottom: 'var(--statusbar-h)', left: 0, right: 0,
            height: Math.min(200, totalH + 24),
            background: 'var(--bg-surface)',
            borderTop: '1.5px solid var(--border-hi)',
            display: 'flex', flexDirection: 'column',
            zIndex: 40,
            animation: 'slide-up 0.2s ease',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
                height: 32,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Waves size={13} color="var(--accent)" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>
                        Timing Diagram
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                        tick {timingTick} · {rows.length} signal{rows.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleTiming}>
                    <X size={13} />
                </button>
            </div>

            {/* Waveform area */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
                {/* Signal labels */}
                <div style={{ width: 100, flexShrink: 0, borderRight: '1px solid var(--border)', paddingTop: 4 }}>
                    {rows.length === 0 && (
                        <div style={{ padding: '16px 8px', fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
                            Add Clock or sequential nodes to see waveforms
                        </div>
                    )}
                    {rows.map((row) => (
                        <div key={row.id} style={{
                            height: SIG_H, display: 'flex', alignItems: 'center',
                            padding: '0 8px', fontSize: 10, color: 'var(--text-2)',
                            fontFamily: 'JetBrains Mono, monospace',
                            borderBottom: '1px solid var(--border)',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                            {row.label}
                        </div>
                    ))}
                </div>

                {/* Waveforms */}
                <div style={{ flex: 1, overflow: 'auto', paddingTop: 4 }}>
                    {rows.map((row) => (
                        <div key={row.id} style={{
                            height: SIG_H,
                            borderBottom: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center',
                        }}>
                            <svg
                                width={svgW}
                                height={SIG_H}
                                style={{ display: 'block', overflow: 'visible' }}
                            >
                                <WaveformPath values={row.values} tickW={TICK_W} waveH={WAVE_H} />
                            </svg>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── SVG waveform path ────────────────────────────────────────────────────────
function WaveformPath({ values, tickW, waveH }: {
    values: (0 | 1)[]; tickW: number; waveH: number
}) {
    if (values.length === 0) {
        return <line x1={0} y1={waveH / 2 + 5} x2={40} y2={waveH / 2 + 5} stroke="var(--border-hi)" strokeWidth={1} />
    }

    const yHi = 5
    const yLo = yHi + waveH

    let d = `M0 ${values[0] === 1 ? yHi : yLo}`
    let x = 0

    for (let i = 0; i < values.length; i++) {
        const cur = values[i] ?? 0
        const next = values[i + 1] ?? cur
        const xEnd = (i + 1) * tickW

        d += ` H${xEnd}`
        if (next !== cur) {
            d += ` V${next === 1 ? yHi : yLo}`
        }
        x = xEnd
    }

    // Final flat line to end
    d += ` H${x + tickW / 2}`

    return (
        <g>
            {/* Zero line */}
            <line x1={0} y1={yLo} x2={x + tickW / 2} y2={yLo} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 3" />
            {/* Waveform */}
            <path
                d={d}
                stroke="#00ff9d"
                strokeWidth={1.5}
                fill="none"
                style={{ filter: 'drop-shadow(0 0 2px #00ff9d66)' }}
            />
            {/* Tick markers */}
            {values.map((_, i) => (
                <line
                    key={i}
                    x1={(i + 1) * tickW}
                    y1={yLo + 2}
                    x2={(i + 1) * tickW}
                    y2={yLo + 5}
                    stroke="var(--text-3)"
                    strokeWidth={0.5}
                />
            ))}
        </g>
    )
}
