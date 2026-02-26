import { GATE_DEFS, INPUT_LABELS, type GateType } from '../../engine/gateLogic'

interface BooleanExpressionProps {
    gateType: GateType
    numInputs: number
    inputLabels?: string[]
}

export function BooleanExpression({
    gateType,
    numInputs,
    inputLabels,
}: BooleanExpressionProps) {
    const def = GATE_DEFS[gateType]
    if (!def) return null

    const labels = inputLabels ?? INPUT_LABELS.slice(0, numInputs)
    const expr = def.boolExpr(labels)

    return (
        <div
            style={{
                padding: '12px 14px',
                background: 'var(--bg-surface-3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 15,
                color: 'var(--accent)',
                textAlign: 'center',
                letterSpacing: '0.04em',
            }}
        >
            <span style={{ color: 'var(--text-2)', fontSize: 11, fontWeight: 600 }}>
                OUTPUT ={' '}
            </span>
            <span style={{ fontWeight: 700 }}>{expr}</span>
        </div>
    )
}
