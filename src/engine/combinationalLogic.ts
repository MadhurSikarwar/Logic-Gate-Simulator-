// ─── Types ────────────────────────────────────────────────────────────────────
export type ComboType =
    | 'HALF_ADDER' | 'FULL_ADDER' | 'ADDER_4' | 'ADDER_8'
    | 'MUX_2_1' | 'MUX_4_1' | 'MUX_8_1'
    | 'DEMUX_1_2' | 'DEMUX_1_4'
    | 'ENCODER_8_3' | 'DECODER_3_8'
    | 'COMP_1' | 'COMP_4'
    | 'PARITY'

export interface ComboDef {
    type: ComboType
    name: string
    shortName: string
    description: string
    category: string
    inputs: string[]
    outputs: string[]
    boolExprs: string[]
    internals: string
    evaluate: (inputs: (0 | 1)[]) => (0 | 1)[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const b = (v: boolean): 0 | 1 => (v ? 1 : 0)
const xor = (a: 0 | 1, c: 0 | 1): 0 | 1 => b((a ^ c) === 1)

// ─── Definitions ─────────────────────────────────────────────────────────────
export const COMBO_DEFS: Record<ComboType, ComboDef> = {

    HALF_ADDER: {
        type: 'HALF_ADDER', name: 'Half Adder', shortName: 'HA',
        category: 'Combinational', description: 'Adds two 1-bit numbers. Produces Sum and Carry out.',
        inputs: ['A', 'B'],
        outputs: ['Sum', 'Carry'],
        boolExprs: ['A ⊕ B', 'A · B'],
        internals: '1× XOR (Sum) · 1× AND (Carry)',
        evaluate: ([a = 0, b2 = 0]) => [xor(a, b2), b(a === 1 && b2 === 1)],
    },

    FULL_ADDER: {
        type: 'FULL_ADDER', name: 'Full Adder', shortName: 'FA',
        category: 'Combinational', description: 'Adds two 1-bit numbers and a carry-in. Produces Sum and Carry out.',
        inputs: ['A', 'B', 'Cin'],
        outputs: ['Sum', 'Cout'],
        boolExprs: ['A ⊕ B ⊕ Cin', 'AB + BCin + ACin'],
        internals: '2× XOR · 2× AND · 1× OR',
        evaluate: ([a = 0, b2 = 0, cin = 0]) => {
            const s = xor(xor(a, b2), cin)
            const c = b((a === 1 && b2 === 1) || (b2 === 1 && cin === 1) || (a === 1 && cin === 1))
            return [s, c]
        },
    },

    ADDER_4: {
        type: 'ADDER_4', name: '4-bit RCA', shortName: '4b+',
        category: 'Combinational', description: '4-bit Ripple-Carry Adder: A[3:0] + B[3:0] = S[3:0] + Cout.',
        inputs: ['A3', 'A2', 'A1', 'A0', 'B3', 'B2', 'B1', 'B0', 'Cin'],
        outputs: ['S3', 'S2', 'S1', 'S0', 'Cout'],
        boolExprs: ['S[3:0] = A + B + Cin', 'Cout'],
        internals: 'Four cascaded Full Adders',
        evaluate: ([a3 = 0, a2 = 0, a1 = 0, a0 = 0, b3 = 0, b2 = 0, b1 = 0, b0 = 0, cin = 0]) => {
            const fa = (a: number, bv: number, c: number): [0 | 1, 0 | 1] => {
                const s = ((a ^ bv ^ c) & 1) as 0 | 1
                const co = b((a & bv) === 1 || (bv & c) === 1 || (a & c) === 1)
                return [s, co]
            }
            const [s0, c0] = fa(a0, b0, cin)
            const [s1, c1] = fa(a1, b1, c0)
            const [s2, c2] = fa(a2, b2, c1)
            const [s3, cout] = fa(a3, b3, c2)
            return [s3, s2, s1, s0, cout]
        },
    },

    ADDER_8: {
        type: 'ADDER_8', name: '8-bit RCA', shortName: '8b+',
        category: 'Combinational', description: '8-bit Ripple-Carry Adder: A[7:0] + B[7:0] = S[7:0] + Cout.',
        inputs: ['A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'B7', 'B6', 'B5', 'B4', 'B3', 'B2', 'B1', 'B0', 'Cin'],
        outputs: ['S7', 'S6', 'S5', 'S4', 'S3', 'S2', 'S1', 'S0', 'Cout'],
        boolExprs: ['S[7:0] = A + B + Cin', 'Cout'],
        internals: 'Eight cascaded Full Adders',
        evaluate: (ins) => {
            const A = ins.slice(0, 8)
            const B = ins.slice(8, 16)
            const cinV = ins[16] ?? 0
            let carry: 0 | 1 = cinV as 0 | 1
            const sums: (0 | 1)[] = []
            for (let i = 7; i >= 0; i--) {
                const a = A[i] ?? 0; const bv = B[i] ?? 0
                const s = (((a ^ bv ^ carry) & 1) === 1 ? 1 : 0) as 0 | 1
                const co = (((a & bv) === 1 || (bv & carry) === 1 || (a & carry) === 1) ? 1 : 0) as 0 | 1
                sums.unshift(s)
                carry = co
            }
            return [...sums, carry]
        },
    },

    MUX_2_1: {
        type: 'MUX_2_1', name: 'MUX 2:1', shortName: 'MUX',
        category: 'Combinational', description: '2-to-1 Multiplexer. Select S routes I0 (S=0) or I1 (S=1) to output.',
        inputs: ['I0', 'I1', 'S'],
        outputs: ['Y'],
        boolExprs: ["S'·I0 + S·I1"],
        internals: '2× AND · 1× OR · 1× NOT',
        evaluate: ([i0 = 0, i1 = 0, s = 0]) => [s === 0 ? i0 : i1],
    },

    MUX_4_1: {
        type: 'MUX_4_1', name: 'MUX 4:1', shortName: 'MUX4',
        category: 'Combinational', description: '4-to-1 Multiplexer. S[1:0] selects one of four inputs.',
        inputs: ['I0', 'I1', 'I2', 'I3', 'S0', 'S1'],
        outputs: ['Y'],
        boolExprs: ['Y = I[S]'],
        internals: '4× AND · 3× OR · 2× NOT',
        evaluate: ([i0 = 0, i1 = 0, i2 = 0, i3 = 0, s0 = 0, s1 = 0]) => {
            const sel = (s1 << 1) | s0
            return [[i0, i1, i2, i3][sel] ?? 0]
        },
    },

    MUX_8_1: {
        type: 'MUX_8_1', name: 'MUX 8:1', shortName: 'MUX8',
        category: 'Combinational', description: '8-to-1 Multiplexer. S[2:0] selects one of eight inputs.',
        inputs: ['I0', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'S0', 'S1', 'S2'],
        outputs: ['Y'],
        boolExprs: ['Y = I[S]'],
        internals: '8× AND · 7× OR · 3× NOT',
        evaluate: (ins) => {
            const s = ((ins[10] ?? 0) << 2) | ((ins[9] ?? 0) << 1) | (ins[8] ?? 0)
            return [ins[s] ?? 0]
        },
    },

    DEMUX_1_2: {
        type: 'DEMUX_1_2', name: 'DEMUX 1:2', shortName: 'DX2',
        category: 'Combinational', description: '1-to-2 Demultiplexer. Routes I to Y0 (S=0) or Y1 (S=1).',
        inputs: ['I', 'S'],
        outputs: ['Y0', 'Y1'],
        boolExprs: ["I·S'", 'I·S'],
        internals: '2× AND · 1× NOT',
        evaluate: ([i = 0, s = 0]) => [b(i === 1 && s === 0), b(i === 1 && s === 1)],
    },

    DEMUX_1_4: {
        type: 'DEMUX_1_4', name: 'DEMUX 1:4', shortName: 'DX4',
        category: 'Combinational', description: '1-to-4 Demultiplexer. Routes I to one of four outputs.',
        inputs: ['I', 'S0', 'S1'],
        outputs: ['Y0', 'Y1', 'Y2', 'Y3'],
        boolExprs: ["I·S1'·S0'", "I·S1'·S0", "I·S1·S0'", "I·S1·S0"],
        internals: '4× AND · 2× NOT',
        evaluate: ([i = 0, s0 = 0, s1 = 0]) => {
            const sel = (s1 << 1) | s0
            return [0, 1, 2, 3].map((j) => b(i === 1 && sel === j)) as (0 | 1)[]
        },
    },

    ENCODER_8_3: {
        type: 'ENCODER_8_3', name: 'Encoder 8:3', shortName: 'ENC',
        category: 'Combinational', description: '8-to-3 Priority Encoder. Outputs binary code for highest active input.',
        inputs: ['I0', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7'],
        outputs: ['A2', 'A1', 'A0', 'Valid'],
        boolExprs: ['A2=I4+I5+I6+I7', 'A1=I2+I3+I6+I7', 'A0=I1+I3+I5+I7'],
        internals: '3× OR (multi-input)',
        evaluate: (ins) => {
            let hi = -1
            for (let i = 7; i >= 0; i--) if (ins[i] === 1) { hi = i; break }
            if (hi < 0) return [0, 0, 0, 0]
            return [
                (((hi >> 2) & 1) === 1 ? 1 : 0) as 0 | 1,
                (((hi >> 1) & 1) === 1 ? 1 : 0) as 0 | 1,
                ((hi & 1) === 1 ? 1 : 0) as 0 | 1,
                1 as 0 | 1
            ]
        },
    },

    DECODER_3_8: {
        type: 'DECODER_3_8', name: 'Decoder 3:8', shortName: 'DEC',
        category: 'Combinational', description: '3-to-8 Decoder with Enable. Activates one of 8 outputs based on A[2:0].',
        inputs: ['A2', 'A1', 'A0', 'EN'],
        outputs: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
        boolExprs: ['Yi = EN · (A === i)'],
        internals: '8× AND · 3× NOT',
        evaluate: ([a2 = 0, a1 = 0, a0 = 0, en = 0]) => {
            const sel = (a2 << 2) | (a1 << 1) | a0
            return Array.from({ length: 8 }, (_, i) => b(en === 1 && i === sel)) as (0 | 1)[]
        },
    },

    COMP_1: {
        type: 'COMP_1', name: 'Comparator 1b', shortName: 'CMP',
        category: 'Combinational', description: '1-bit magnitude comparator. Outputs A>B, A=B, A<B.',
        inputs: ['A', 'B'],
        outputs: ['A>B', 'A=B', 'A<B'],
        boolExprs: ['A·B\'', 'XNOR(A,B)', 'A\'·B'],
        internals: '2× AND · 1× NOT · 1× XNOR',
        evaluate: ([a = 0, bv = 0]) => [b(a > bv), b(a === bv), b(a < bv)],
    },

    COMP_4: {
        type: 'COMP_4', name: 'Comparator 4b', shortName: 'CMP4',
        category: 'Combinational', description: '4-bit magnitude comparator. Outputs A>B, A=B, A<B.',
        inputs: ['A3', 'A2', 'A1', 'A0', 'B3', 'B2', 'B1', 'B0'],
        outputs: ['A>B', 'A=B', 'A<B'],
        boolExprs: ['A > B', 'A = B', 'A < B'],
        internals: 'Cascaded 1-bit comparators with carry propagation',
        evaluate: ([a3 = 0, a2 = 0, a1 = 0, a0 = 0, b3 = 0, b2 = 0, b1 = 0, b0 = 0]) => {
            const A = (a3 << 3) | (a2 << 2) | (a1 << 1) | a0
            const B = (b3 << 3) | (b2 << 2) | (b1 << 1) | b0
            return [b(A > B), b(A === B), b(A < B)]
        },
    },

    PARITY: {
        type: 'PARITY', name: 'Parity Gen', shortName: 'PAR',
        category: 'Combinational', description: '8-bit Parity Generator/Checker. Outputs Even Parity and Odd Parity bits.',
        inputs: ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'],
        outputs: ['Even', 'Odd'],
        boolExprs: ['D7⊕D6⊕…⊕D0', '(D7⊕D6⊕…⊕D0)\''],
        internals: '7× XOR',
        evaluate: (ins) => {
            const ones = ins.reduce((s: number, v) => s + (v ?? 0), 0)
            const even: 0 | 1 = ones % 2 === 0 ? 1 : 0
            const odd: 0 | 1 = even === 0 ? 1 : 0
            return [even, odd]
        },
    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function evaluateCombo(type: ComboType, inputs: (0 | 1)[]): (0 | 1)[] {
    return COMBO_DEFS[type]?.evaluate(inputs) ?? []
}

export const COMBO_ITEMS = Object.values(COMBO_DEFS).map((d) => ({
    type: d.type,
    name: d.name,
    description: d.description,
}))
