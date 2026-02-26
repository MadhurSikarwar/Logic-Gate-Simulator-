import type { GateType } from '../../engine/gateLogic'

interface GateSVGProps {
    type: GateType
    outputValue: 0 | 1
    width?: number
    height?: number
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const FILL = 'var(--bg-surface-3)'
const STROKE_LOW = 'var(--border-hi)'
const STROKE_HIGH = '#00ff9d'
const SW = 1.5  // strokeWidth

function bodyStyle(outputValue: 0 | 1) {
    return {
        fill: FILL,
        stroke: outputValue === 1 ? STROKE_HIGH : STROKE_LOW,
        strokeWidth: SW,
        filter: outputValue === 1 ? 'drop-shadow(0 0 4px #00ff9d88)' : undefined,
        transition: 'stroke 0.15s, filter 0.15s',
    }
}

// ─── Individual gate shapes (all in viewBox "0 0 64 48") ──────────────────────

function AndShape({ output }: { output: 0 | 1 }) {
    const s = bodyStyle(output)
    return (
        <g>
            {/* Body: flat left, D-shaped right */}
            <path d="M 8 6 H 28 Q 56 6 56 24 Q 56 42 28 42 H 8 Z" {...s} />
            {/* Input lines */}
            <line x1="0" y1="16" x2="8" y2="16" stroke={s.stroke} strokeWidth={SW} />
            <line x1="0" y1="32" x2="8" y2="32" stroke={s.stroke} strokeWidth={SW} />
            {/* Output line */}
            <line x1="56" y1="24" x2="64" y2="24" stroke={s.stroke} strokeWidth={SW} />
        </g>
    )
}

function OrShape({ output }: { output: 0 | 1 }) {
    const s = bodyStyle(output)
    return (
        <g>
            {/* OR body: convex right, concave left */}
            <path d="M 8 6 Q 30 6 56 24 Q 30 42 8 42 Q 18 24 8 6 Z" {...s} />
            <line x1="0" y1="17" x2="12" y2="17" stroke={s.stroke} strokeWidth={SW} />
            <line x1="0" y1="31" x2="12" y2="31" stroke={s.stroke} strokeWidth={SW} />
            <line x1="56" y1="24" x2="64" y2="24" stroke={s.stroke} strokeWidth={SW} />
        </g>
    )
}

function NotShape({ output }: { output: 0 | 1 }) {
    const s = bodyStyle(output)
    return (
        <g>
            {/* Triangle body */}
            <path d="M 8 6 L 8 42 L 50 24 Z" {...s} />
            {/* Bubble circle at tip */}
            <circle cx="54" cy="24" r="4" {...s} />
            {/* Lines */}
            <line x1="0" y1="24" x2="8" y2="24" stroke={s.stroke} strokeWidth={SW} />
            <line x1="58" y1="24" x2="64" y2="24" stroke={s.stroke} strokeWidth={SW} />
        </g>
    )
}

function NandShape({ output }: { output: 0 | 1 }) {
    const s = bodyStyle(output)
    return (
        <g>
            {/* AND body, slightly narrower to leave room for bubble */}
            <path d="M 8 6 H 26 Q 50 6 50 24 Q 50 42 26 42 H 8 Z" {...s} />
            {/* Bubble */}
            <circle cx="54" cy="24" r="4" {...s} />
            <line x1="0" y1="16" x2="8" y2="16" stroke={s.stroke} strokeWidth={SW} />
            <line x1="0" y1="32" x2="8" y2="32" stroke={s.stroke} strokeWidth={SW} />
            <line x1="58" y1="24" x2="64" y2="24" stroke={s.stroke} strokeWidth={SW} />
        </g>
    )
}

function NorShape({ output }: { output: 0 | 1 }) {
    const s = bodyStyle(output)
    return (
        <g>
            {/* OR body, narrower */}
            <path d="M 8 6 Q 26 6 50 24 Q 26 42 8 42 Q 17 24 8 6 Z" {...s} />
            {/* Bubble */}
            <circle cx="54" cy="24" r="4" {...s} />
            <line x1="0" y1="17" x2="12" y2="17" stroke={s.stroke} strokeWidth={SW} />
            <line x1="0" y1="31" x2="12" y2="31" stroke={s.stroke} strokeWidth={SW} />
            <line x1="58" y1="24" x2="64" y2="24" stroke={s.stroke} strokeWidth={SW} />
        </g>
    )
}

function XorShape({ output }: { output: 0 | 1 }) {
    const s = bodyStyle(output)
    return (
        <g>
            {/* OR body */}
            <path d="M 12 6 Q 32 6 56 24 Q 32 42 12 42 Q 21 24 12 6 Z" {...s} />
            {/* Extra curved line (XOR indicator) */}
            <path d="M 6 6 Q 15 24 6 42" fill="none" stroke={s.stroke} strokeWidth={SW} />
            <line x1="0" y1="17" x2="14" y2="17" stroke={s.stroke} strokeWidth={SW} />
            <line x1="0" y1="31" x2="14" y2="31" stroke={s.stroke} strokeWidth={SW} />
            <line x1="56" y1="24" x2="64" y2="24" stroke={s.stroke} strokeWidth={SW} />
        </g>
    )
}

function XnorShape({ output }: { output: 0 | 1 }) {
    const s = bodyStyle(output)
    return (
        <g>
            {/* XOR body narrower */}
            <path d="M 12 6 Q 28 6 50 24 Q 28 42 12 42 Q 20 24 12 6 Z" {...s} />
            {/* Extra curved XOR line */}
            <path d="M 6 6 Q 15 24 6 42" fill="none" stroke={s.stroke} strokeWidth={SW} />
            {/* Bubble */}
            <circle cx="54" cy="24" r="4" {...s} />
            <line x1="0" y1="17" x2="14" y2="17" stroke={s.stroke} strokeWidth={SW} />
            <line x1="0" y1="31" x2="14" y2="31" stroke={s.stroke} strokeWidth={SW} />
            <line x1="58" y1="24" x2="64" y2="24" stroke={s.stroke} strokeWidth={SW} />
        </g>
    )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function GateSVG({ type, outputValue, width = 64, height = 48 }: GateSVGProps) {
    const shapeProps = { output: outputValue }
    let shape: React.ReactNode

    switch (type) {
        case 'AND': shape = <AndShape {...shapeProps} />; break
        case 'OR': shape = <OrShape {...shapeProps} />; break
        case 'NOT': shape = <NotShape {...shapeProps} />; break
        case 'NAND': shape = <NandShape {...shapeProps} />; break
        case 'NOR': shape = <NorShape {...shapeProps} />; break
        case 'XOR': shape = <XorShape {...shapeProps} />; break
        case 'XNOR': shape = <XnorShape {...shapeProps} />; break
        default: shape = null
    }

    return (
        <svg
            viewBox="0 0 64 48"
            width={width}
            height={height}
            style={{ overflow: 'visible', display: 'block' }}
        >
            {shape}
        </svg>
    )
}
