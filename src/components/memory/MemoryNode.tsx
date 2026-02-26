import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { MEM_DEFS, type MemType, type MemState } from '../../engine/memoryLogic'
import { useCircuitStore } from '../../store/circuitStore'

export interface MemoryNodeData {
    memType: MemType
    inputValues: (0 | 1)[]
    outputValues: (0 | 1)[]
    memState: MemState
    [key: string]: unknown
}

const CHIP_W = 150
const ROW_H = 22
const HDR_H = 48

const HEADER_COLORS: Record<string, string> = {
    ROM: '#1a0800',
    RAM: '#001218',
    REG: '#0d001a',
    STK: '#001a0a',
    FIF: '#001212',
}
const ACCENT_COLORS: Record<string, string> = {
    ROM: '#ff8c42',
    RAM: '#38bdf8',
    REG: '#c084fc',
    STK: '#4ade80',
    FIF: '#2dd4bf',
}

function getCategory(type: MemType): string {
    if (type.startsWith('ROM')) return 'ROM'
    if (type.startsWith('RAM')) return 'RAM'
    if (type === 'REG_FILE') return 'REG'
    if (type === 'STACK') return 'STK'
    return 'FIF'
}

function handleStyle(signal: 0 | 1, accent: string): React.CSSProperties {
    const isHigh = signal === 1
    return {
        width: 11, height: 11,
        background: isHigh ? accent : 'var(--bg-surface-3)',
        border: `2px solid ${isHigh ? accent : 'var(--border-hi)'}`,
        boxShadow: isHigh ? `0 0 6px ${accent}88` : 'none',
        zIndex: 10, transition: 'background 0.15s',
    }
}

function MemoryNodeComponent({ data, id, selected }: NodeProps) {
    const d = data as MemoryNodeData
    const def = MEM_DEFS[d.memType]
    if (!def) return null

    const { toggleInput, setMemViewerId } = useCircuitStore()

    const cat = getCategory(d.memType)
    const accent = ACCENT_COLORS[cat] ?? 'var(--accent)'
    const hdrBg = HEADER_COLORS[cat] ?? 'var(--bg-surface-3)'

    const numIn = def.inputs.length
    const numOut = def.outputs.length
    const rows = Math.max(numIn, numOut)
    const h = rows * ROW_H + HDR_H + 8

    const inputs = d.inputValues ?? Array(numIn).fill(0)
    const outputs = d.outputValues ?? Array(numOut).fill(0)
    const memState = d.memState ?? def.initState

    const inputTopPct = (i: number) =>
        `${HDR_H / h * 100 + ((i + 0.5) / numIn) * (1 - HDR_H / h) * 100}%`
    const outputTopPct = (i: number) =>
        `${HDR_H / h * 100 + ((i + 0.5) / numOut) * (1 - HDR_H / h) * 100}%`

    const handleToggle = useCallback((idx: number) => () => toggleInput(id, idx), [id, toggleInput])

    // Current address/data for display
    const addrBits = inputs.slice(def.hasClk ? 1 : 0, def.hasClk ? 1 + Math.log2(def.memSize) : Math.log2(def.memSize))
    const curAddr = addrBits.reduce((acc: number, v, i) => acc | ((v as number) << (addrBits.length - 1 - i)), 0)
    const curData = memState.data[curAddr] ?? 0
    const hexAddr = curAddr.toString(16).toUpperCase().padStart(2, '0')
    const hexData = curData.toString(16).toUpperCase().padStart(def.dataWidth <= 4 ? 1 : 2, '0')

    return (
        <div style={{ width: CHIP_W, height: h, position: 'relative', cursor: 'grab', userSelect: 'none' }}
            onDoubleClick={() => setMemViewerId(id)}
            title="Double-click to view/edit memory contents"
        >
            {/* Input handles */}
            {def.inputs.map((_, i) => (
                <Handle key={`in-${i}`} id={`input-${i}`} type="target" position={Position.Left}
                    onClick={handleToggle(i)}
                    style={{ top: inputTopPct(i), ...handleStyle(inputs[i] ?? 0, accent) }}
                />
            ))}

            {/* Chip body */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'var(--bg-surface-2)',
                border: `1.5px solid ${selected ? accent : `${accent}44`}`,
                borderRadius: 8,
                outline: selected ? `2px solid ${accent}` : 'none',
                outlineOffset: 3,
                boxShadow: `0 2px 12px ${accent}11`,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
            }}>
                {/* Header */}
                <div style={{
                    height: HDR_H, background: hdrBg,
                    borderBottom: `1px solid ${accent}33`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px', gap: 3,
                }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
                        {def.shortName}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                        {def.memSize}×{def.dataWidth}b
                    </span>
                    {/* Address/Data display */}
                    <div style={{ display: 'flex', gap: 4, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
                        <span style={{ background: `${accent}18`, borderRadius: 3, padding: '1px 4px', color: accent }}>@{hexAddr}</span>
                        <span style={{ background: 'rgba(0,255,157,0.1)', borderRadius: 3, padding: '1px 4px', color: '#00ff9d' }}>={hexData}h</span>
                    </div>
                </div>

                {/* Input/Output labels */}
                <div style={{ position: 'relative', height: h - HDR_H }}>
                    {def.inputs.map((label, i) => {
                        const topPx = (i + 0.5) / numIn * (h - HDR_H)
                        const isHigh = (inputs[i] ?? 0) === 1
                        const isClk = label === 'CLK'
                        return (
                            <span key={`il-${i}`} style={{
                                position: 'absolute', left: 5, top: topPx,
                                transform: 'translateY(-50%)', fontSize: 8,
                                fontFamily: 'JetBrains Mono, monospace',
                                color: isClk ? '#c084fc' : isHigh ? '#00ff9d' : 'var(--text-3)',
                                display: 'flex', alignItems: 'center', gap: 2,
                                maxWidth: 60, overflow: 'hidden',
                            }}>
                                {isClk && (
                                    <svg width="6" height="6" viewBox="0 0 6 6" style={{ flexShrink: 0 }}>
                                        <polyline points="0,6 2.5,0 6,6" fill="none" stroke="#c084fc" strokeWidth="1.2" />
                                    </svg>
                                )}
                                {label}
                            </span>
                        )
                    })}
                    {def.outputs.map((label, i) => {
                        const topPx = (i + 0.5) / numOut * (h - HDR_H)
                        const isHigh = (outputs[i] ?? 0) === 1
                        return (
                            <span key={`ol-${i}`} style={{
                                position: 'absolute', right: 5, top: topPx,
                                transform: 'translateY(-50%)', fontSize: 8,
                                fontFamily: 'JetBrains Mono, monospace',
                                color: isHigh ? accent : 'var(--text-3)',
                                textAlign: 'right', maxWidth: 55, overflow: 'hidden',
                            }}>
                                {label}
                            </span>
                        )
                    })}
                </div>
            </div>

            {/* Output handles */}
            {def.outputs.map((_, i) => (
                <Handle key={`out-${i}`} id={`output-${i}`} type="source" position={Position.Right}
                    style={{ top: outputTopPct(i), ...handleStyle(outputs[i] ?? 0, accent) }}
                />
            ))}
        </div>
    )
}

export const MemoryNode = memo(MemoryNodeComponent)
