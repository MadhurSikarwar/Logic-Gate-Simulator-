import { generateTruthTable, INPUT_LABELS, type GateType } from '../../engine/gateLogic'

interface TruthTableProps {
    gateType: GateType
    numInputs: number
    currentInputs?: (0 | 1)[]
}

export function TruthTable({ gateType, numInputs, currentInputs }: TruthTableProps) {
    const rows = generateTruthTable(gateType, numInputs)
    const labels = INPUT_LABELS.slice(0, numInputs)

    if (!rows.length) return null

    const cellStyle = (val: 0 | 1, isCurrent: boolean): React.CSSProperties => ({
        padding: '4px 8px',
        textAlign: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
        fontWeight: isCurrent ? 700 : 400,
        color: val === 1
            ? '#00ff9d'
            : isCurrent
                ? 'var(--text-1)'
                : 'var(--text-2)',
        background: isCurrent ? 'var(--accent-dim)' : 'transparent',
        transition: 'background 0.15s, color 0.15s',
    })

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {labels.map((l) => (
                            <th
                                key={l}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: 'var(--accent)',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    textAlign: 'center',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {l}
                            </th>
                        ))}
                        <th
                            style={{
                                padding: '4px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--text-2)',
                                fontFamily: 'JetBrains Mono, monospace',
                                textAlign: 'center',
                                borderLeft: '1px solid var(--border)',
                            }}
                        >
                            OUT
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => {
                        // Check if this row matches the current inputs
                        const isCurrent =
                            currentInputs != null &&
                            row.inputs.every((v, i) => v === (currentInputs[i] ?? 0))

                        return (
                            <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                                {row.inputs.map((val, ci) => (
                                    <td key={ci} style={cellStyle(val, isCurrent)}>
                                        {val}
                                    </td>
                                ))}
                                <td
                                    style={{
                                        ...cellStyle(row.output, isCurrent),
                                        borderLeft: '1px solid var(--border)',
                                        fontWeight: isCurrent ? 800 : 600,
                                    }}
                                >
                                    {row.output}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
