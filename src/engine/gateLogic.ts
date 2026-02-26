// ─── Gate Types ──────────────────────────────────────────────────────────────
export type GateType =
    | 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR'
    | 'INPUT' | 'OUTPUT' | 'CLOCK' | 'BUS'

// ─── Gate Metadata ────────────────────────────────────────────────────────────
export interface GateDefinition {
    type: GateType
    label: string
    category: string
    defaultInputs: number
    minInputs: number
    maxInputs: number
    description: string
    boolExpr: (inputs: string[]) => string
    evaluate: (inputs: (0 | 1)[]) => 0 | 1
    hasBubble: boolean
}

const def = (d: GateDefinition): GateDefinition => d

export const GATE_DEFS: Record<GateType, GateDefinition> = {
    AND: def({
        type: 'AND', label: 'AND', category: 'Basic Gates',
        defaultInputs: 2, minInputs: 2, maxInputs: 8,
        hasBubble: false,
        description: 'Output is HIGH only when ALL inputs are HIGH.',
        boolExpr: (i) => i.join(' · '),
        evaluate: (ins) => (ins.every((x) => x === 1) ? 1 : 0),
    }),
    OR: def({
        type: 'OR', label: 'OR', category: 'Basic Gates',
        defaultInputs: 2, minInputs: 2, maxInputs: 8,
        hasBubble: false,
        description: 'Output is HIGH when ANY input is HIGH.',
        boolExpr: (i) => i.join(' + '),
        evaluate: (ins) => (ins.some((x) => x === 1) ? 1 : 0),
    }),
    NOT: def({
        type: 'NOT', label: 'NOT', category: 'Basic Gates',
        defaultInputs: 1, minInputs: 1, maxInputs: 1,
        hasBubble: true,
        description: 'Output is the logical inverse of the input (inverter).',
        boolExpr: (i) => `${i[0]}'`,
        evaluate: (ins) => (ins[0] === 1 ? 0 : 1),
    }),
    NAND: def({
        type: 'NAND', label: 'NAND', category: 'Basic Gates',
        defaultInputs: 2, minInputs: 2, maxInputs: 8,
        hasBubble: true,
        description: 'NOT AND — Output is LOW only when all inputs are HIGH.',
        boolExpr: (i) => `(${i.join(' · ')})'`,
        evaluate: (ins) => (ins.every((x) => x === 1) ? 0 : 1),
    }),
    NOR: def({
        type: 'NOR', label: 'NOR', category: 'Basic Gates',
        defaultInputs: 2, minInputs: 2, maxInputs: 8,
        hasBubble: true,
        description: 'NOT OR — Output is HIGH only when all inputs are LOW.',
        boolExpr: (i) => `(${i.join(' + ')})'`,
        evaluate: (ins) => (ins.some((x) => x === 1) ? 0 : 1),
    }),
    XOR: def({
        type: 'XOR', label: 'XOR', category: 'Basic Gates',
        defaultInputs: 2, minInputs: 2, maxInputs: 8,
        hasBubble: false,
        description: 'Output is HIGH when an ODD number of inputs are HIGH.',
        boolExpr: (i) => i.join(' ⊕ '),
        evaluate: (ins) => ((ins.reduce((a, b) => (a ^ b) as 0 | 1, 0 as 0 | 1)) as 0 | 1),
    }),
    XNOR: def({
        type: 'XNOR', label: 'XNOR', category: 'Basic Gates',
        defaultInputs: 2, minInputs: 2, maxInputs: 8,
        hasBubble: true,
        description: 'Output is HIGH when an EVEN number of inputs are HIGH.',
        boolExpr: (i) => `(${i.join(' ⊕ ')})'`,
        evaluate: (ins) => ((ins.reduce((a, b) => (a ^ b) as 0 | 1, 0 as 0 | 1) === 0 ? 1 : 0) as 0 | 1),
    }),
    INPUT: def({
        type: 'INPUT', label: 'Input', category: 'Inputs & Outputs',
        defaultInputs: 0, minInputs: 0, maxInputs: 0,
        hasBubble: false,
        description: 'Manual input switch — click to toggle between HIGH (1) and LOW (0).',
        boolExpr: ([name]) => name ?? 'X',
        evaluate: (ins) => ins[0] ?? 0,
    }),
    OUTPUT: def({
        type: 'OUTPUT', label: 'Output', category: 'Inputs & Outputs',
        defaultInputs: 1, minInputs: 1, maxInputs: 1,
        hasBubble: false,
        description: 'LED output indicator — shows the signal level.',
        boolExpr: ([v]) => v ?? '?',
        evaluate: (ins) => ins[0] ?? 0,
    }),
    CLOCK: def({
        type: 'CLOCK', label: 'Clock', category: 'Inputs & Outputs',
        defaultInputs: 0, minInputs: 0, maxInputs: 0,
        hasBubble: false,
        description: 'Periodic clock signal source.',
        boolExpr: () => 'CLK',
        evaluate: (ins) => ins[0] ?? 0,
    }),
    BUS: def({
        type: 'BUS', label: 'Bus', category: 'Inputs & Outputs',
        defaultInputs: 1, minInputs: 1, maxInputs: 8,
        hasBubble: false,
        description: 'Multi-bit bus connection.',
        boolExpr: (i) => i[0] ?? 'B',
        evaluate: (ins) => ins[0] ?? 0,
    }),
}

// ─── Evaluate a gate ─────────────────────────────────────────────────────────
export function evaluateGate(type: GateType, inputs: (0 | 1)[]): 0 | 1 {
    return GATE_DEFS[type]?.evaluate(inputs) ?? 0
}

// ─── Truth Table ─────────────────────────────────────────────────────────────
export interface TruthTableRow {
    inputs: (0 | 1)[]
    output: 0 | 1
}

export function generateTruthTable(type: GateType, numInputs: number): TruthTableRow[] {
    if (numInputs === 0) return []
    const rows: TruthTableRow[] = []
    const total = 1 << numInputs
    for (let i = 0; i < total; i++) {
        const inputs: (0 | 1)[] = []
        for (let bit = numInputs - 1; bit >= 0; bit--) {
            inputs.push(((i >> bit) & 1) as 0 | 1)
        }
        rows.push({ inputs, output: evaluateGate(type, inputs) })
    }
    return rows
}

// ─── Input labels ────────────────────────────────────────────────────────────
export const INPUT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
