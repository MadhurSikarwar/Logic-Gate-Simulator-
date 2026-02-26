import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { SEQ_DEFS, type SeqType, type SeqState } from '../../engine/sequentialLogic'
import { useCircuitStore } from '../../store/circuitStore'

export interface SeqNodeData {
    seqType: SeqType
    inputValues: (0 | 1)[]
    outputValues: (0 | 1)[]
    seqState: SeqState
    [key: string]: unknown
}

const CHIP_W = 130
const ROW_H = 22
const HDR_H = 36

function sigColor(v: 0 | 1) { return v === 1 ? '#00ff9d' : 'var(--sig-low)' }

function handleStyle(signal: 0 | 1, top: string, isClk = false): React.CSSProperties {
    const h = 11
    const high = signal === 1
    return {
        top,
        width: h,
        height: h,
        background: isClk ? 'var(--bg-surface-3)' : sigColor(signal),
        border: `2px solid ${high || isClk ? '#00ff9d' : 'var(--border-hi)'}`,
        boxShadow: high ? '0 0 6px #00ff9daa' : 'none',
        cursor: 'pointer',
        zIndex: 10,
        transition: 'background 0.15s',
        ...(isClk ? { borderRadius: 2 } : {}),
    }
}

function SeqNodeComponent({ data, id, selected }: NodeProps) {
    const d = data as SeqNodeData
    const def = SEQ_DEFS[d.seqType]
    if (!def) return null

    const { toggleInput } = useCircuitStore()

    const numIn = def.inputs.length
    const numOut = def.outputs.length
    const rows = Math.max(numIn, numOut)
    const h = rows * ROW_H + HDR_H + 8

    const inputs = d.inputValues ?? Array(numIn).fill(0)
    const outputs = d.outputValues ?? Array(numOut).fill(0)
    const Q = d.seqState?.Q ?? [0]

    const inputTopPct = (i: number) =>
        `${HDR_H / h * 100 + ((i + 0.5) / numIn) * (1 - HDR_H / h) * 100}%`
    const outputTopPct = (i: number) =>
        `${HDR_H / h * 100 + ((i + 0.5) / numOut) * (1 - HDR_H / h) * 100}%`

    const handleToggle = useCallback((idx: number) => () => toggleInput(id, idx), [id, toggleInput])

    const qDisplay = Q.map((v) => v).join('')

    return (
        <div style={{ width: CHIP_W, height: h, position: 'relative', cursor: 'grab', userSelect: 'none' }}>
            {/* Input handles */}
            {def.inputs.map((label, i) => (
                <Handle
                    key={`in-${i}`}
                    id={`input-${i}`}
                    type="target"
                    position={Position.Left}
                    onClick={handleToggle(i)}
                    style={handleStyle(inputs[i] ?? 0, inputTopPct(i), label === 'CLK')}
                />
            ))}

            {/* Chip body */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'var(--bg-surface-2)',
                border: `1.5px solid ${selected ? 'var(--accent)' : '#3a2060'}`,
                borderRadius: 8,
                outline: selected ? '2px solid var(--accent)' : 'none',
                outlineOffset: 3,
                boxShadow: outputs.some((v) => v === 1)
                    ? '0 0 16px rgba(0,255,157,0.18)'
                    : '0 2px 8px rgba(0,0,0,0.45)',
                overflow: 'hidden',
                transition: 'border-color 0.15s, box-shadow 0.15s',
            }}>
                {/* Header */}
                <div style={{
                    height: HDR_H,
                    background: 'linear-gradient(135deg, #18002a 0%, #1a0040 100%)',
                    borderBottom: '1px solid #3a2060',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px',
                }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#c084fc', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
                        {def.shortName}
                    </span>
                    {/* Q display */}
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: Q[0] === 1 ? 'rgba(0,255,157,0.2)' : 'var(--bg-surface-3)',
                        border: `1px solid ${Q[0] === 1 ? '#00ff9d44' : 'var(--border)'}`,
                        borderRadius: 4, padding: '0 5px', fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                        color: Q[0] === 1 ? '#00ff9d' : 'var(--text-3)',
                        marginTop: 2, letterSpacing: '0.1em',
                    }}>
                        Q={qDisplay}
                    </span>
                </div>

                {/* Pin labels */}
                <div style={{ position: 'relative', height: h - HDR_H }}>
                    {/* Input labels */}
                    {def.inputs.map((label, i) => {
                        const topPx = (i + 0.5) / numIn * (h - HDR_H)
                        const isHigh = (inputs[i] ?? 0) === 1
                        const isClk = label === 'CLK'
                        return (
                            <span key={`il-${i}`} style={{
                                position: 'absolute', left: 5, top: topPx, transform: 'translateY(-50%)',
                                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                                color: isClk ? '#c084fc' : isHigh ? '#00ff9d' : 'var(--text-3)',
                                whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 42,
                                display: 'flex', alignItems: 'center', gap: 2,
                            }}>
                                {isClk ? (
                                    <svg width="7" height="7" viewBox="0 0 7 7" style={{ flexShrink: 0 }}>
                                        <polyline points="0,7 3,0 7,7" fill="none" stroke="#c084fc" strokeWidth="1.2" />
                                    </svg>
                                ) : null}
                                {label}
                            </span>
                        )
                    })}

                    {/* Output labels */}
                    {def.outputs.map((label, i) => {
                        const topPx = (i + 0.5) / numOut * (h - HDR_H)
                        const isHigh = (outputs[i] ?? 0) === 1
                        return (
                            <span key={`ol-${i}`} style={{
                                position: 'absolute', right: 5, top: topPx, transform: 'translateY(-50%)',
                                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                                color: isHigh ? '#00ff9d' : 'var(--text-3)',
                                whiteSpace: 'nowrap', textAlign: 'right', overflow: 'hidden', maxWidth: 42,
                            }}>
                                {label}
                            </span>
                        )
                    })}
                </div>
            </div>

            {/* Output handles */}
            {def.outputs.map((_, i) => (
                <Handle
                    key={`out-${i}`}
                    id={`output-${i}`}
                    type="source"
                    position={Position.Right}
                    style={handleStyle(outputs[i] ?? 0, outputTopPct(i))}
                />
            ))}
        </div>
    )
}

export const SeqNode = memo(SeqNodeComponent)
