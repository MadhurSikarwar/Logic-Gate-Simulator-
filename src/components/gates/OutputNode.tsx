import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface OutputNodeData {
    gateType: 'OUTPUT'
    inputValues: (0 | 1)[]
    outputValue: 0 | 1
    label?: string
    [key: string]: unknown
}

function OutputNodeComponent({ data, selected }: NodeProps) {
    const d = data as OutputNodeData
    const isHigh = (d.inputValues?.[0] ?? d.outputValue) === 1

    return (
        <div
            style={{
                width: 56,
                height: 40,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* LED body */}
            <div
                style={{
                    width: 48,
                    height: 32,
                    borderRadius: 24,
                    background: isHigh ? 'rgba(0,255,157,0.12)' : 'var(--bg-surface-3)',
                    border: `1.5px solid ${isHigh ? '#00ff9d' : selected ? 'var(--accent)' : 'var(--border-hi)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: isHigh ? '0 0 16px rgba(0,255,157,0.4), inset 0 0 8px rgba(0,255,157,0.15)' : 'none',
                    transition: 'all 0.15s',
                    outline: selected ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 3,
                }}
            >
                {/* LED bulb */}
                <div
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: isHigh ? '#00ff9d' : 'var(--sig-low)',
                        boxShadow: isHigh ? '0 0 10px #00ff9d, 0 0 20px #00ff9d88' : 'none',
                        transition: 'all 0.15s',
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 14,
                        fontWeight: 700,
                        color: isHigh ? '#00ff9d' : 'var(--text-3)',
                        transition: 'color 0.15s',
                    }}
                >
                    {isHigh ? '1' : '0'}
                </span>
            </div>

            {/* Label */}
            <div
                style={{
                    position: 'absolute',
                    bottom: -18,
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    fontFamily: 'JetBrains Mono, monospace',
                    pointerEvents: 'none',
                }}
            >
                {d.label ?? 'OUT'}
            </div>

            {/* Input handle */}
            <Handle
                id="input-0"
                type="target"
                position={Position.Left}
                style={{
                    top: '50%',
                    width: 12,
                    height: 12,
                    background: isHigh ? '#00ff9d' : 'var(--sig-low)',
                    border: `2px solid ${isHigh ? '#00ff9d' : 'var(--border-hi)'}`,
                    boxShadow: isHigh ? '0 0 8px #00ff9daa' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
            />
        </div>
    )
}

export const OutputNode = memo(OutputNodeComponent)
