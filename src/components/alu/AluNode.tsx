import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ALU_DEFS, aluOpName, aluOpColor, type AluType } from '../../engine/aluLogic'
import { useCircuitStore } from '../../store/circuitStore'

export interface AluNodeData {
    aluType: AluType
    inputValues: (0 | 1)[]
    outputValues: (0 | 1)[]
    [key: string]: unknown
}

const CHIP_W = 148
const ROW_H = 20
const HDR_H = 52

const CAT_COLORS: Record<string, string> = {
    alu: '#38bdf8',
    multiply: '#a78bfa',
    shift: '#facc15',
    convert: '#34d399',
}
const CAT_BG: Record<string, string> = {
    alu: '#001218',
    multiply: '#0d0020',
    shift: '#120e00',
    convert: '#001812',
}

function sigColor(v: 0 | 1): string { return v === 1 ? '#00ff9d' : 'var(--sig-low)' }

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

// Flag pill for Z/N/OVF/Cout display
function FlagPill({ label, on }: { label: string; on: boolean }) {
    return (
        <span style={{
            fontSize: 8, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            padding: '1px 4px', borderRadius: 3,
            background: on ? 'rgba(0,255,157,0.2)' : 'var(--bg-surface-3)',
            color: on ? '#00ff9d' : 'var(--text-3)',
            border: `1px solid ${on ? '#00ff9d44' : 'transparent'}`,
            transition: 'all 0.15s',
        }}>
            {label}
        </span>
    )
}

function AluNodeComponent({ data, id, selected }: NodeProps) {
    const d = data as AluNodeData
    const def = ALU_DEFS[d.aluType]
    if (!def) return null

    const { toggleInput } = useCircuitStore()

    const cat = def.category
    const accent = CAT_COLORS[cat] ?? '#38bdf8'
    const hdrBg = CAT_BG[cat] ?? '#001218'

    const numIn = def.inputs.length
    const numOut = def.outputs.length
    const rows = Math.max(numIn, numOut)
    const h = rows * ROW_H + HDR_H + 8

    const inputs = d.inputValues ?? Array(numIn).fill(0)
    const outputs = d.outputValues ?? Array(numOut).fill(0)

    // Detect op bits for ALU_4BIT / ALU_8BIT
    let opLabel = ''
    let opColor = accent
    if (d.aluType === 'ALU_4BIT') {
        const opBits = inputs.slice(9, 12) as (0 | 1)[]
        opLabel = aluOpName(opBits, 4)
        opColor = aluOpColor(opLabel)
    } else if (d.aluType === 'ALU_8BIT') {
        const opBits = inputs.slice(17, 20) as (0 | 1)[]
        opLabel = aluOpName(opBits, 8)
        opColor = aluOpColor(opLabel)
    }

    // Detect flag outputs for ALU types
    const hasFlags = d.aluType === 'ALU_4BIT' || d.aluType === 'ALU_8BIT'
    const flagStart = d.aluType === 'ALU_4BIT' ? 4 : 8
    const cout = hasFlags ? (outputs[flagStart] ?? 0) : -1
    const flagZ = hasFlags ? (outputs[flagStart + 1] ?? 0) : -1
    const flagN = hasFlags ? (outputs[flagStart + 2] ?? 0) : -1
    const flagOVF = hasFlags ? (outputs[flagStart + 3] ?? 0) : -1

    const inputTopPct = (i: number) =>
        `${HDR_H / h * 100 + ((i + 0.5) / numIn) * (1 - HDR_H / h) * 100}%`
    const outputTopPct = (i: number) =>
        `${HDR_H / h * 100 + ((i + 0.5) / numOut) * (1 - HDR_H / h) * 100}%`

    const handleToggle = useCallback((idx: number) => () => toggleInput(id, idx), [id, toggleInput])

    return (
        <div style={{ width: CHIP_W, height: h, position: 'relative', cursor: 'grab', userSelect: 'none' }}>
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
                border: `1.5px solid ${selected ? accent : `${accent}55`}`,
                borderRadius: 8,
                outline: selected ? `2px solid ${accent}` : 'none',
                outlineOffset: 3,
                boxShadow: `0 2px 16px ${accent}11`,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
            }}>
                {/* Header */}
                <div style={{
                    height: HDR_H, background: hdrBg,
                    borderBottom: `1px solid ${accent}33`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0 6px',
                }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: accent, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
                        {def.shortName}
                    </span>

                    {/* Operation label for ALU types */}
                    {opLabel && (
                        <span style={{
                            fontSize: 12, fontWeight: 900, color: opColor,
                            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
                            background: `${opColor}18`, borderRadius: 4, padding: '1px 8px',
                            border: `1px solid ${opColor}44`,
                            transition: 'all 0.15s',
                        }}>
                            {opLabel}
                        </span>
                    )}

                    {/* Flag pills for ALU types */}
                    {hasFlags && (
                        <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                            <FlagPill label="C" on={cout === 1} />
                            <FlagPill label="Z" on={flagZ === 1} />
                            <FlagPill label="N" on={flagN === 1} />
                            <FlagPill label="V" on={flagOVF === 1} />
                        </div>
                    )}
                    {!opLabel && !hasFlags && (
                        <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{def.inputs.length}→{def.outputs.length}</span>
                    )}
                </div>

                {/* Pin labels */}
                <div style={{ position: 'relative', height: h - HDR_H }}>
                    {def.inputs.map((label, i) => {
                        const topPx = (i + 0.5) / numIn * (h - HDR_H)
                        const isHigh = (inputs[i] ?? 0) === 1
                        const isOp = label.startsWith('Op') || label.startsWith('S')
                        return (
                            <span key={`il-${i}`} style={{
                                position: 'absolute', left: 5, top: topPx, transform: 'translateY(-50%)',
                                fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                                color: isOp ? opColor || accent : isHigh ? '#00ff9d' : 'var(--text-3)',
                                maxWidth: 55, overflow: 'hidden', whiteSpace: 'nowrap',
                            }}>
                                {label}
                            </span>
                        )
                    })}
                    {def.outputs.map((label, i) => {
                        const topPx = (i + 0.5) / numOut * (h - HDR_H)
                        const isHigh = (outputs[i] ?? 0) === 1
                        const isFlag = ['Z', 'N', 'OVF', 'Cout', 'Cout'].includes(label)
                        return (
                            <span key={`ol-${i}`} style={{
                                position: 'absolute', right: 5, top: topPx, transform: 'translateY(-50%)',
                                fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                                color: isFlag && isHigh ? '#00ff9d' : isHigh ? accent : 'var(--text-3)',
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

export const AluNode = memo(AluNodeComponent)
