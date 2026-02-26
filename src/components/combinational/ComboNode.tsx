import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { COMBO_DEFS, type ComboType } from '../../engine/combinationalLogic'
import { useCircuitStore } from '../../store/circuitStore'

// ─── Data shape ───────────────────────────────────────────────────────────────
export interface ComboNodeData {
    componentType: ComboType
    inputValues: (0 | 1)[]
    outputValues: (0 | 1)[]
    [key: string]: unknown
}

const HANDLE_SIZE = 11
const CHIP_W = 120     // total node width
const ROW_H = 22       // pixels per pin row
const HDR_H = 32       // header height

function pinColor(v: 0 | 1) {
    return v === 1 ? '#00ff9d' : 'var(--sig-low)'
}

function handleStyle(signal: 0 | 1, type: 'target' | 'source', top: string): React.CSSProperties {
    const isHigh = signal === 1
    return {
        top,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        background: pinColor(signal),
        border: `2px solid ${isHigh ? '#00ff9d' : 'var(--border-hi)'}`,
        boxShadow: isHigh ? '0 0 6px #00ff9daa' : 'none',
        cursor: type === 'target' ? 'pointer' : 'crosshair',
        transition: 'background 0.15s, box-shadow 0.15s',
        zIndex: 10,
    }
}

function ComboNodeComponent({ data, id, selected }: NodeProps) {
    const d = data as ComboNodeData
    const def = COMBO_DEFS[d.componentType]
    if (!def) return null

    const { toggleInput, setInternalViewId } = useCircuitStore()

    const numIn = def.inputs.length
    const numOut = def.outputs.length
    const rows = Math.max(numIn, numOut)
    const h = rows * ROW_H + HDR_H + 8

    const inputValues = d.inputValues ?? Array(numIn).fill(0)
    const outputValues = d.outputValues ?? Array(numOut).fill(0)

    const inputTopPct = (i: number) => `${HDR_H / h * 100 + ((i + 0.5) / numIn) * (1 - HDR_H / h) * 100}%`
    const outputTopPct = (i: number) => `${HDR_H / h * 100 + ((i + 0.5) / numOut) * (1 - HDR_H / h) * 100}%`

    const handleToggle = useCallback(
        (idx: number) => () => toggleInput(id, idx),
        [id, toggleInput]
    )

    return (
        <div
            style={{
                width: CHIP_W,
                height: h,
                position: 'relative',
                cursor: 'grab',
                userSelect: 'none',
            }}
            onDoubleClick={() => setInternalViewId(id)}
            title="Double-click to view internal structure"
        >
            {/* ── Input handles ────────────────────────────────────────── */}
            {def.inputs.map((_, i) => (
                <Handle
                    key={`in-${i}`}
                    id={`input-${i}`}
                    type="target"
                    position={Position.Left}
                    onClick={handleToggle(i)}
                    style={handleStyle(inputValues[i] ?? 0, 'target', inputTopPct(i))}
                />
            ))}

            {/* ── Chip body ─────────────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--bg-surface-2)',
                    border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-hi)'}`,
                    borderRadius: 8,
                    outline: selected ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 3,
                    boxShadow: outputValues.some((v) => v === 1)
                        ? '0 0 14px rgba(0,255,157,0.2)'
                        : '0 2px 8px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        height: HDR_H,
                        background: 'var(--bg-surface-3)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '0 8px',
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: 'var(--accent)',
                            fontFamily: 'JetBrains Mono, monospace',
                            letterSpacing: '0.04em',
                        }}
                    >
                        {def.shortName}
                    </span>
                    <span
                        style={{
                            fontSize: 9,
                            color: 'var(--text-3)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {def.name}
                    </span>
                </div>

                {/* Pin labels area */}
                <div style={{ position: 'relative', flex: 1, height: h - HDR_H }}>
                    {/* Input labels */}
                    {def.inputs.map((label, i) => {
                        const topPx = (i + 0.5) / numIn * (h - HDR_H)
                        const isHigh = (inputValues[i] ?? 0) === 1
                        return (
                            <span
                                key={`il-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: 5,
                                    top: topPx,
                                    transform: 'translateY(-50%)',
                                    fontSize: 9,
                                    fontFamily: 'JetBrains Mono, monospace',
                                    color: isHigh ? '#00ff9d' : 'var(--text-3)',
                                    transition: 'color 0.15s',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    maxWidth: 42,
                                }}
                            >
                                {label}
                            </span>
                        )
                    })}

                    {/* Output labels */}
                    {def.outputs.map((label, i) => {
                        const topPx = (i + 0.5) / numOut * (h - HDR_H)
                        const isHigh = (outputValues[i] ?? 0) === 1
                        return (
                            <span
                                key={`ol-${i}`}
                                style={{
                                    position: 'absolute',
                                    right: 5,
                                    top: topPx,
                                    transform: 'translateY(-50%)',
                                    fontSize: 9,
                                    fontFamily: 'JetBrains Mono, monospace',
                                    color: isHigh ? '#00ff9d' : 'var(--text-3)',
                                    transition: 'color 0.15s',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'right',
                                    overflow: 'hidden',
                                    maxWidth: 42,
                                }}
                            >
                                {label}
                            </span>
                        )
                    })}
                </div>
            </div>

            {/* ── Output handles ────────────────────────────────────────── */}
            {def.outputs.map((_, i) => (
                <Handle
                    key={`out-${i}`}
                    id={`output-${i}`}
                    type="source"
                    position={Position.Right}
                    style={handleStyle(outputValues[i] ?? 0, 'source', outputTopPct(i))}
                />
            ))}
        </div>
    )
}

export const ComboNode = memo(ComboNodeComponent)
