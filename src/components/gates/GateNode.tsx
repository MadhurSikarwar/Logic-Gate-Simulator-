import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GateSVG } from './GateSVG'
import { GATE_DEFS, type GateType } from '../../engine/gateLogic'
import { useCircuitStore } from '../../store/circuitStore'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GateNodeData {
    gateType: GateType
    numInputs: number
    inputValues: (0 | 1)[]
    outputValue: 0 | 1
    label?: string
    [key: string]: unknown
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const GATE_W = 64
const HANDLE_SIZE = 12

function nodeHeight(numInputs: number) {
    return Math.max(60, numInputs * 22 + 16)
}

// Position of each input handle as a percentage of node height
function inputHandleTopPct(idx: number, total: number): number {
    return ((idx + 1) / (total + 1)) * 100
}

// ─── Single Handle ────────────────────────────────────────────────────────────
function SignalHandle({
    id, type, position, topPct, signal, onClick,
}: {
    id: string
    type: 'source' | 'target'
    position: Position
    topPct: number
    signal: 0 | 1
    onClick?: () => void
}) {
    const isHigh = signal === 1
    return (
        <Handle
            id={id}
            type={type}
            position={position}
            onClick={onClick}
            style={{
                top: `${topPct}%`,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                background: isHigh ? '#00ff9d' : 'var(--sig-low)',
                border: `2px solid ${isHigh ? '#00ff9d' : 'var(--border-hi)'}`,
                boxShadow: isHigh ? '0 0 8px #00ff9daa' : 'none',
                cursor: type === 'target' ? 'pointer' : 'crosshair',
                transition: 'background 0.15s, box-shadow 0.15s, border-color 0.15s',
                zIndex: 10,
            }}
        />
    )
}

// ─── Gate Node ────────────────────────────────────────────────────────────────
function GateNodeComponent({ data, id, selected }: NodeProps) {
    const gateData = data as GateNodeData
    const { gateType, numInputs, inputValues = [], outputValue = 0 } = gateData
    const { toggleInput } = useCircuitStore()
    const def = GATE_DEFS[gateType]

    const h = nodeHeight(numInputs)
    const isHigh = outputValue === 1

    const handleToggle = useCallback(
        (idx: number) => () => toggleInput(id, idx),
        [id, toggleInput]
    )

    return (
        <div
            style={{
                width: GATE_W,
                height: h,
                position: 'relative',
                cursor: 'grab',
            }}
        >
            {/* ── Input handles ────────────────────────────────────────── */}
            {Array.from({ length: numInputs }).map((_, i) => (
                <SignalHandle
                    key={i}
                    id={`input-${i}`}
                    type="target"
                    position={Position.Left}
                    topPct={inputHandleTopPct(i, numInputs)}
                    signal={inputValues[i] ?? 0}
                    onClick={handleToggle(i)}
                />
            ))}

            {/* ── Gate SVG body ────────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    outline: selected ? `2px solid var(--accent)` : 'none',
                    outlineOffset: 3,
                    transition: 'outline 0.1s',
                }}
            >
                <GateSVG
                    type={gateType}
                    outputValue={outputValue}
                    width={GATE_W}
                    height={h * 0.8}
                />
            </div>

            {/* ── Gate label (below node) ───────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    bottom: -18,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: isHigh ? '#00ff9d' : 'var(--text-3)',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    transition: 'color 0.15s',
                }}
            >
                {def?.label ?? gateType}
            </div>

            {/* ── Output handle ────────────────────────────────────────── */}
            <SignalHandle
                id="output"
                type="source"
                position={Position.Right}
                topPct={50}
                signal={outputValue}
            />
        </div>
    )
}

export const GateNode = memo(GateNodeComponent)
