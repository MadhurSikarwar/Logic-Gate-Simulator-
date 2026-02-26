import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useCircuitStore } from '../../store/circuitStore'

export interface InputNodeData {
    gateType: 'INPUT'
    outputValue: 0 | 1
    label?: string
    [key: string]: unknown
}

function InputNodeComponent({ data, id, selected }: NodeProps) {
    const d = data as InputNodeData
    const { toggleInput } = useCircuitStore()
    const isHigh = d.outputValue === 1

    const toggle = useCallback(() => toggleInput(id, -1), [id, toggleInput])

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
            {/* Switch body */}
            <div
                onClick={toggle}
                title="Click to toggle"
                style={{
                    width: 48,
                    height: 32,
                    borderRadius: 6,
                    background: isHigh ? 'rgba(0,255,157,0.12)' : 'var(--bg-surface-3)',
                    border: `1.5px solid ${isHigh ? '#00ff9d' : selected ? 'var(--accent)' : 'var(--border-hi)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 6px',
                    cursor: 'pointer',
                    boxShadow: isHigh ? '0 0 12px rgba(0,255,157,0.35)' : 'none',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                    outline: selected ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 3,
                }}
            >
                {/* Toggle pill */}
                <div
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: isHigh ? '#00ff9d' : 'var(--border-hi)',
                        boxShadow: isHigh ? '0 0 6px #00ff9d' : 'none',
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
                {d.label ?? 'IN'}
            </div>

            {/* Output handle */}
            <Handle
                id="output"
                type="source"
                position={Position.Right}
                style={{
                    top: '50%',
                    width: 12,
                    height: 12,
                    background: isHigh ? '#00ff9d' : 'var(--sig-low)',
                    border: `2px solid ${isHigh ? '#00ff9d' : 'var(--border-hi)'}`,
                    boxShadow: isHigh ? '0 0 8px #00ff9daa' : 'none',
                    cursor: 'crosshair',
                    transition: 'all 0.15s',
                }}
            />
        </div>
    )
}

export const InputNode = memo(InputNodeComponent)
