import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { disassemble, type CpuState } from '../../engine/cpuLogic'
import { useCircuitStore } from '../../store/circuitStore'

export interface CpuNodeData {
    cpuState: CpuState
    inputValues: (0 | 1)[]
    outputValues: (0 | 1)[]
    [key: string]: unknown
}

const CHIP_W = 160
const HDR_H = 88
const BODY_H = 80
const CHIP_H = HDR_H + BODY_H + 8

const ACCENT = '#f43f5e'  // red — matches real CPU chip packaging

function handleStyle(signal: 0 | 1, accent: string = '#00ff9d'): React.CSSProperties {
    const isHigh = signal === 1
    return {
        width: 11, height: 11,
        background: isHigh ? accent : 'var(--bg-surface-3)',
        border: `2px solid ${isHigh ? accent : 'var(--border-hi)'}`,
        boxShadow: isHigh ? `0 0 6px ${accent}88` : 'none',
        zIndex: 10, transition: 'background 0.15s',
    }
}

function FlagDot({ label, on }: { label: string; on: boolean }) {
    return (
        <span style={{
            fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            padding: '1px 4px', borderRadius: 3,
            background: on ? 'rgba(251,191,36,0.2)' : 'var(--bg-surface-3)',
            color: on ? '#fbbf24' : 'var(--text-3)',
            border: `1px solid ${on ? '#fbbf2444' : 'transparent'}`,
            transition: 'all 0.12s',
        }}>
            {label}
        </span>
    )
}

const INPUT_LABELS = ['CLK', 'RST']
const OUTPUT_LABELS = ['OUT3', 'OUT2', 'OUT1', 'OUT0', 'Z', 'N', 'C', 'HLT']

function CpuNodeComponent({ data, id, selected }: NodeProps) {
    const d = data as CpuNodeData
    const { toggleInput, setCpuPanelId } = useCircuitStore()

    const inputs = d.inputValues ?? [0, 0]
    const outputs = d.outputValues ?? Array(8).fill(0)
    const cs = d.cpuState ?? null

    const regs = cs?.registers ?? [0, 0, 0, 0]
    const pc = cs?.pc ?? 0
    const ir = cs?.ir ?? 0
    const flags = cs?.flags ?? { Z: 0, N: 0, C: 0 }
    const halted = cs?.halted ?? false

    const mnemonic = disassemble(ir)
    const outByte = (outputs[0] << 3) | (outputs[1] << 2) | (outputs[2] << 1) | outputs[3]

    const pcTop = (i: number) => `${(HDR_H / CHIP_H * 100) + ((i + 0.5) / INPUT_LABELS.length) * (BODY_H / CHIP_H * 100)}%`
    const opTop = (i: number) => `${(HDR_H / CHIP_H * 100) + ((i + 0.5) / OUTPUT_LABELS.length) * (BODY_H / CHIP_H * 100)}%`

    const handleToggle = useCallback((idx: number) => () => toggleInput(id, idx), [id, toggleInput])

    return (
        <div style={{ width: CHIP_W, height: CHIP_H, position: 'relative', cursor: 'grab', userSelect: 'none' }}
            onDoubleClick={() => setCpuPanelId(id)}
            title="Double-click to open CPU debugger"
        >
            {/* Input handles */}
            {INPUT_LABELS.map((_, i) => (
                <Handle key={`in-${i}`} id={`input-${i}`} type="target" position={Position.Left}
                    onClick={handleToggle(i)}
                    style={{ top: pcTop(i), ...handleStyle(inputs[i] ?? 0, i === 0 ? '#c084fc' : '#f87171') }}
                />
            ))}

            {/* Main chip body */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'var(--bg-surface-2)',
                border: `1.5px solid ${selected ? ACCENT : `${ACCENT}55`}`,
                borderRadius: 8, overflow: 'hidden',
                outline: selected ? `2px solid ${ACCENT}` : 'none', outlineOffset: 3,
                boxShadow: halted ? '0 0 20px rgba(244,63,94,0.3)' : '0 2px 16px rgba(244,63,94,0.1)',
                transition: 'border-color 0.15s',
            }}>
                {/* Header */}
                <div style={{
                    height: HDR_H,
                    background: 'linear-gradient(135deg, #1a0010 0%, #12000e 100%)',
                    borderBottom: `1px solid ${ACCENT}33`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0 8px',
                }}>
                    {/* Name + Halted */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 900, color: ACCENT, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>CPU4</span>
                        {halted && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 3, padding: '1px 5px' }}>HALT</span>
                        )}
                    </div>

                    {/* PC + Instruction */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9, color: ACCENT, fontFamily: 'JetBrains Mono, monospace', background: `${ACCENT}18`, border: `1px solid ${ACCENT}33`, borderRadius: 3, padding: '1px 5px' }}>
                            PC:{pc.toString(16).toUpperCase().padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: 9, color: '#00ff9d', fontFamily: 'JetBrains Mono, monospace', background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                            {mnemonic}
                        </span>
                    </div>

                    {/* Registers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, width: '100%' }}>
                        {(['R0', 'R1', 'R2', 'R3'] as const).map((rn, i) => (
                            <div key={rn} style={{ textAlign: 'center', background: 'var(--bg-surface-3)', borderRadius: 4, padding: '2px 0' }}>
                                <div style={{ fontSize: 8, color: 'var(--text-3)', fontFamily: 'monospace' }}>{rn}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: regs[i] !== 0 ? '#00ff9d' : 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {regs[i].toString(16).toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Flags */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        <FlagDot label="Z" on={flags.Z === 1} />
                        <FlagDot label="N" on={flags.N === 1} />
                        <FlagDot label="C" on={flags.C === 1} />
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-3)', marginLeft: 2 }}>OUT:{outByte.toString(16).toUpperCase()}</span>
                    </div>
                </div>

                {/* Pin labels */}
                <div style={{ position: 'relative', height: BODY_H }}>
                    {INPUT_LABELS.map((lbl, i) => {
                        const topPx = (i + 0.5) / INPUT_LABELS.length * BODY_H
                        const isClk = lbl === 'CLK'
                        return (
                            <span key={lbl} style={{
                                position: 'absolute', left: 5, top: topPx, transform: 'translateY(-50%)',
                                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                                color: isClk ? '#c084fc' : '#f87171',
                                display: 'flex', alignItems: 'center', gap: 2,
                            }}>
                                {isClk && (
                                    <svg width="6" height="6" viewBox="0 0 6 6" style={{ flexShrink: 0 }}>
                                        <polyline points="0,6 2.5,0 6,6" fill="none" stroke="#c084fc" strokeWidth="1.2" />
                                    </svg>
                                )}
                                {lbl}
                            </span>
                        )
                    })}
                    {OUTPUT_LABELS.map((lbl, i) => {
                        const topPx = (i + 0.5) / OUTPUT_LABELS.length * BODY_H
                        const isHigh = (outputs[i] ?? 0) === 1
                        const isFlag = ['Z', 'N', 'C', 'HLT'].includes(lbl)
                        return (
                            <span key={lbl} style={{
                                position: 'absolute', right: 5, top: topPx, transform: 'translateY(-50%)',
                                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                                color: isHigh ? (isFlag ? '#fbbf24' : '#00ff9d') : 'var(--text-3)',
                                textAlign: 'right',
                            }}>{lbl}</span>
                        )
                    })}
                </div>
            </div>

            {/* Output handles */}
            {OUTPUT_LABELS.map((_, i) => (
                <Handle key={`out-${i}`} id={`output-${i}`} type="source" position={Position.Right}
                    style={{ top: opTop(i), ...handleStyle(outputs[i] ?? 0, ['Z', 'N', 'C', 'HLT'].includes(OUTPUT_LABELS[i]!) ? '#fbbf24' : '#00ff9d') }}
                />
            ))}
        </div>
    )
}

export const CpuNode = memo(CpuNodeComponent)
