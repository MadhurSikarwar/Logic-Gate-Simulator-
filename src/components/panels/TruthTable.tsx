import { useMemo } from 'react'
import { useCircuitStore } from '../../store/circuitStore'
import { evaluateGate, type GateType } from '../../engine/gateLogic'
import { evaluateCombo, COMBO_DEFS, type ComboType } from '../../engine/combinationalLogic'

const MAX_ROWS = 64  // cap at 2^6 combinations

interface TruthTableRow {
    inputs: (0 | 1)[]
    outputs: (0 | 1)[]
    isCurrent: boolean
}

function generateTable(
    numInputs: number,
    numOutputs: number,
    currentInputs: (0 | 1)[],
    evaluate: (ins: (0 | 1)[]) => (0 | 1) | (0 | 1)[]
): TruthTableRow[] {
    const total = Math.pow(2, numInputs)
    const limit = Math.min(total, MAX_ROWS)
    const rows: TruthTableRow[] = []

    for (let i = 0; i < limit; i++) {
        const inputs: (0 | 1)[] = Array.from({ length: numInputs }, (_, bit) =>
            (((i >> (numInputs - 1 - bit)) & 1) as 0 | 1)
        )
        const raw = evaluate(inputs)
        const outputs: (0 | 1)[] = Array.isArray(raw) ? raw : [raw]
        const isCurrent = inputs.every((v, idx) => v === (currentInputs[idx] ?? 0))
        rows.push({ inputs, outputs, isCurrent })
    }
    return rows
}

export function TruthTable() {
    const { selectedNodeId, nodes } = useCircuitStore()
    const node = nodes.find((n) => n.id === selectedNodeId)
    const data = node?.data as Record<string, unknown> | undefined

    const info = useMemo((): {
        inputLabels: string[]
        outputLabels: string[]
        rows: TruthTableRow[]
        truncated: boolean
        title: string
    } | null => {
        if (!node || !data) return null

        const gateType = data.gateType as GateType | undefined
        const componentType = data.componentType as ComboType | undefined
        const currentInputs = (data.inputValues as (0 | 1)[]) ?? []

        if (gateType && gateType !== 'INPUT' && gateType !== 'OUTPUT' && gateType !== 'CLOCK') {
            const numInputs = (data.numInputs as number) ?? 2
            if (numInputs > 8) return null  // too many
            const iLabels = Array.from({ length: numInputs }, (_, i) => `A${numInputs > 1 ? String.fromCharCode(65 + i) : ''}`)
            const rows = generateTable(numInputs, 1, currentInputs, (ins) => evaluateGate(gateType, ins))
            const total = Math.pow(2, numInputs)
            return { inputLabels: iLabels, outputLabels: ['OUT'], rows, truncated: total > MAX_ROWS, title: `${gateType} Gate` }
        }

        if (componentType) {
            const def = COMBO_DEFS[componentType]
            if (!def) return null
            const numInputs = def.inputs.length
            if (numInputs > 8) return null
            const rows = generateTable(numInputs, def.outputs.length, currentInputs, (ins) => evaluateCombo(componentType, ins))
            const total = Math.pow(2, numInputs)
            return { inputLabels: def.inputs, outputLabels: def.outputs, rows, truncated: total > MAX_ROWS, title: def.name }
        }

        return null
    }, [node, data])

    if (!info) return null

    const { inputLabels, outputLabels, rows, truncated, title } = info
    const colCount = inputLabels.length + outputLabels.length

    return (
        <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Truth Table — {title}</span>
                <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 400 }}>{rows.length} rows{truncated ? ' (truncated)' : ''}</span>
            </div>

            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 300, borderRadius: 6, border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-surface-2)', position: 'sticky', top: 0, zIndex: 1 }}>
                            {inputLabels.map((lbl, i) => (
                                <th key={`ih-${i}`} style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--text-2)', fontWeight: 700, fontSize: 10, borderBottom: '1px solid var(--border-hi)', borderRight: i === inputLabels.length - 1 ? '2px solid var(--border-hi)' : '1px solid var(--border)' }}>
                                    {lbl}
                                </th>
                            ))}
                            {outputLabels.map((lbl, i) => (
                                <th key={`oh-${i}`} style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 10, borderBottom: '1px solid var(--border-hi)', borderRight: i < outputLabels.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    {lbl}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} style={{
                                background: row.isCurrent ? 'rgba(0,212,255,0.12)' : ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                transition: 'background 0.1s',
                                boxShadow: row.isCurrent ? 'inset 0 0 0 1px rgba(0,212,255,0.25)' : 'none',
                            }}>
                                {row.inputs.map((v, i) => (
                                    <td key={`iv-${i}`} style={{ padding: '4px 8px', textAlign: 'center', color: row.isCurrent ? 'var(--accent)' : 'var(--text-2)', borderRight: i === row.inputs.length - 1 ? '2px solid var(--border-hi)' : '1px solid var(--border)', fontWeight: row.isCurrent ? 700 : 400 }}>
                                        {v}
                                    </td>
                                ))}
                                {row.outputs.map((v, i) => (
                                    <td key={`ov-${i}`} style={{ padding: '4px 8px', textAlign: 'center', color: v === 1 ? '#00ff9d' : 'var(--text-3)', fontWeight: 700, borderRight: i < row.outputs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        {v}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {truncated && (
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
                    Showing first {MAX_ROWS} of {Math.pow(2, inputLabels.length)} combinations
                </div>
            )}
        </div>
    )
}
