// ─── Types ────────────────────────────────────────────────────────────────────
export type AluType =
    | 'ALU_4BIT'
    | 'ALU_8BIT'
    | 'MULT_4x4'
    | 'BARREL_SL4'
    | 'BARREL_SR4'
    | 'BARREL_ROT4'
    | 'TWOS_COMP4'
    | 'ABS_VAL4'
    | 'BCD_ADDER'

export interface AluDef {
    type: AluType
    name: string
    shortName: string
    description: string
    inputs: string[]
    outputs: string[]
    category: 'alu' | 'multiply' | 'shift' | 'convert'
    evaluate: (inputs: (0 | 1)[]) => (0 | 1)[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fromBits(bits: (0 | 1)[]): number {
    return bits.reduce((acc: number, v, i) => acc | ((v as number) << (bits.length - 1 - i)), 0)
}

function toBits(val: number, width: number): (0 | 1)[] {
    return Array.from({ length: width }, (_, i) =>
        (((val >>> (width - 1 - i)) & 1) === 1 ? 1 : 0)
    )
}

function addN(a: number, b: number, cin: number, bits: number): { result: number; cout: number } {
    const sum = a + b + cin
    const mask = (1 << bits) - 1
    return { result: sum & mask, cout: (sum >>> bits) & 1 }
}

function signExtend(val: number, bits: number): number {
    const sign = (val >> (bits - 1)) & 1
    return sign ? (val | (~((1 << bits) - 1))) : val
}

// ALU operations
const OPS_4 = ['ADD', 'SUB', 'AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR']
const OPS_8 = ['ADD', 'SUB', 'AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR']
const OP_COLORS: Record<string, string> = {
    ADD: '#38bdf8', SUB: '#f472b6',
    AND: '#4ade80', OR: '#4ade80', XOR: '#4ade80', NOT: '#4ade80',
    SHL: '#facc15', SHR: '#facc15',
}

export function aluOpName(opBits: (0 | 1)[], bits: 4 | 8 = 4): string {
    const idx = fromBits(opBits)
    return (bits === 4 ? OPS_4 : OPS_8)[idx] ?? 'NOP'
}

export function aluOpColor(opName: string): string {
    return OP_COLORS[opName] ?? '#94a3b8'
}

// ─── 4-bit ALU evaluate ───────────────────────────────────────────────────────
function alu4(a: number, b: number, cin: number, op: number): {
    result: number; cout: number; flags: { Z: 0 | 1; N: 0 | 1; OVF: 0 | 1; P: 0 | 1 }
} {
    let result = 0; let cout = 0
    const mask = 0xF

    switch (op & 7) {
        case 0: { // ADD
            const s = a + b + cin; result = s & mask; cout = (s >> 4) & 1
            const aSign = (a >> 3) & 1; const bSign = (b >> 3) & 1; const rSign = (result >> 3) & 1
            const ovf = (aSign === bSign && rSign !== aSign) ? 1 : 0
            return { result, cout, flags: { Z: result === 0 ? 1 : 0, N: rSign as 0 | 1, OVF: ovf as 0 | 1, P: parityBit(result, 4) } }
        }
        case 1: { // SUB (A - B = A + ~B + 1)
            const bComp = (~b) & mask
            const s = a + bComp + 1; result = s & mask; cout = (s >> 4) & 1
            const aSign = (a >> 3) & 1; const bSign2 = (b >> 3) & 1; const rSign = (result >> 3) & 1
            const ovf2 = (aSign !== bSign2 && rSign !== aSign) ? 1 : 0
            return { result, cout, flags: { Z: result === 0 ? 1 : 0, N: rSign as 0 | 1, OVF: ovf2 as 0 | 1, P: parityBit(result, 4) } }
        }
        case 2: result = (a & b) & mask; break     // AND
        case 3: result = (a | b) & mask; break     // OR
        case 4: result = (a ^ b) & mask; break     // XOR
        case 5: result = (~a) & mask; break        // NOT A
        case 6: result = (a << 1) & mask; cout = (a >> 3) & 1; break  // SHL
        case 7: result = (a >> 1) & mask; cout = a & 1; break         // SHR
    }
    const neg = (result >> 3) & 1
    return { result, cout, flags: { Z: result === 0 ? 1 : 0, N: neg as 0 | 1, OVF: 0, P: parityBit(result, 4) } }
}

function parityBit(val: number, bits: number): 0 | 1 {
    let count = 0
    for (let i = 0; i < bits; i++) count += (val >> i) & 1
    return (count & 1) as 0 | 1
}

// ─── Definitions ─────────────────────────────────────────────────────────────
export const ALU_DEFS: Record<AluType, AluDef> = {

    // ── 4-bit ALU ─────────────────────────────────────────────────────────────

    ALU_4BIT: {
        type: 'ALU_4BIT', name: '4-bit ALU', shortName: 'ALU4',
        description: '4-bit ALU with 8 operations (ADD/SUB/AND/OR/XOR/NOT/SHL/SHR). ' +
            'Op[2:0] selects operation. Outputs 4-bit result and flags: Carry, Zero, Negative, Overflow.',
        inputs: ['A3', 'A2', 'A1', 'A0', 'B3', 'B2', 'B1', 'B0', 'Cin', 'Op2', 'Op1', 'Op0'],
        outputs: ['R3', 'R2', 'R1', 'R0', 'Cout', 'Z', 'N', 'OVF'],
        category: 'alu',
        evaluate: (ins) => {
            const a = fromBits(ins.slice(0, 4) as (0 | 1)[])
            const b = fromBits(ins.slice(4, 8) as (0 | 1)[])
            const cin = ins[8] ?? 0
            const op = fromBits(ins.slice(9, 12) as (0 | 1)[])
            const { result, cout, flags } = alu4(a, b, cin, op)
            return [...toBits(result, 4), cout as 0 | 1, flags.Z, flags.N, flags.OVF]
        },
    },

    // ── 8-bit ALU ─────────────────────────────────────────────────────────────

    ALU_8BIT: {
        type: 'ALU_8BIT', name: '8-bit ALU', shortName: 'ALU8',
        description: '8-bit ALU with same 8 operations as 4-bit. Op[2:0] selects. ' +
            'Outputs 8-bit result and flags: Cout, Zero, Negative, Overflow.',
        inputs: ['A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'B7', 'B6', 'B5', 'B4', 'B3', 'B2', 'B1', 'B0', 'Cin', 'Op2', 'Op1', 'Op0'],
        outputs: ['R7', 'R6', 'R5', 'R4', 'R3', 'R2', 'R1', 'R0', 'Cout', 'Z', 'N', 'OVF'],
        category: 'alu',
        evaluate: (ins) => {
            const a = fromBits(ins.slice(0, 8) as (0 | 1)[])
            const b = fromBits(ins.slice(8, 16) as (0 | 1)[])
            const cin = ins[16] ?? 0
            const op = fromBits(ins.slice(17, 20) as (0 | 1)[])
            const mask8 = 0xFF
            let result = 0; let cout = 0

            switch (op & 7) {
                case 0: { const s = a + b + (cin as number); result = s & mask8; cout = s >> 8; break }
                case 1: { const s = a + ((~b) & mask8) + 1; result = s & mask8; cout = s >> 8; break }
                case 2: result = (a & b) & mask8; break
                case 3: result = (a | b) & mask8; break
                case 4: result = (a ^ b) & mask8; break
                case 5: result = (~a) & mask8; break
                case 6: result = (a << 1) & mask8; cout = (a >> 7) & 1; break
                case 7: result = (a >> 1) & mask8; cout = a & 1; break
            }
            const neg = (result >> 7) & 1
            const ovf = 0  // simplified
            const z: 0 | 1 = result === 0 ? 1 : 0
            return [...toBits(result, 8), cout as 0 | 1, z, neg as 0 | 1, ovf as 0 | 1]
        },
    },

    // ── 4×4 Multiplier ────────────────────────────────────────────────────────

    MULT_4x4: {
        type: 'MULT_4x4', name: '4×4 Multiplier', shortName: '×4',
        description: '4-bit × 4-bit unsigned multiplier. Produces 8-bit product P[7:0] = A × B.',
        inputs: ['A3', 'A2', 'A1', 'A0', 'B3', 'B2', 'B1', 'B0'],
        outputs: ['P7', 'P6', 'P5', 'P4', 'P3', 'P2', 'P1', 'P0'],
        category: 'multiply',
        evaluate: (ins) => {
            const a = fromBits(ins.slice(0, 4) as (0 | 1)[])
            const b = fromBits(ins.slice(4, 8) as (0 | 1)[])
            return toBits((a * b) & 0xFF, 8)
        },
    },

    // ── Barrel Shift Left 4-bit ───────────────────────────────────────────────

    BARREL_SL4: {
        type: 'BARREL_SL4', name: 'Barrel Shift Left', shortName: 'BSL4',
        description: '4-bit barrel shifter (logical shift left). S[1:0] selects shift amount 0–3.',
        inputs: ['D3', 'D2', 'D1', 'D0', 'S1', 'S0'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0', 'Cout'],
        category: 'shift',
        evaluate: (ins) => {
            const d = fromBits(ins.slice(0, 4) as (0 | 1)[])
            const s = fromBits(ins.slice(4, 6) as (0 | 1)[])
            const shifted = (d << s) & 0xF
            const cout = s > 0 ? (d >> (4 - s)) & 1 : 0
            return [...toBits(shifted, 4), cout as 0 | 1]
        },
    },

    // ── Barrel Shift Right 4-bit ──────────────────────────────────────────────

    BARREL_SR4: {
        type: 'BARREL_SR4', name: 'Barrel Shift Right', shortName: 'BSR4',
        description: '4-bit barrel shifter (logical shift right). S[1:0] selects shift amount 0–3.',
        inputs: ['D3', 'D2', 'D1', 'D0', 'S1', 'S0'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0', 'Cout'],
        category: 'shift',
        evaluate: (ins) => {
            const d = fromBits(ins.slice(0, 4) as (0 | 1)[])
            const s = fromBits(ins.slice(4, 6) as (0 | 1)[])
            const shifted = (d >> s) & 0xF
            const cout = s > 0 ? (d << (4 - s)) & 1 : 0
            return [...toBits(shifted, 4), cout as 0 | 1]
        },
    },

    // ── Barrel Rotate Left 4-bit ──────────────────────────────────────────────

    BARREL_ROT4: {
        type: 'BARREL_ROT4', name: 'Barrel Rotate', shortName: 'ROT4',
        description: '4-bit barrel rotate left. S[1:0] selects rotate amount 0–3.',
        inputs: ['D3', 'D2', 'D1', 'D0', 'S1', 'S0'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0'],
        category: 'shift',
        evaluate: (ins) => {
            const d = fromBits(ins.slice(0, 4) as (0 | 1)[])
            const s = fromBits(ins.slice(4, 6) as (0 | 1)[]) & 3
            const rotated = ((d << s) | (d >> (4 - s))) & 0xF
            return toBits(rotated, 4)
        },
    },

    // ── 2's Complement ────────────────────────────────────────────────────────

    TWOS_COMP4: {
        type: 'TWOS_COMP4', name: "2's Complement", shortName: '-A4',
        description: "4-bit 2's complementer (negation). R = -A = ~A + 1. OVF=1 when A=1000.",
        inputs: ['A3', 'A2', 'A1', 'A0'],
        outputs: ['R3', 'R2', 'R1', 'R0', 'OVF'],
        category: 'convert',
        evaluate: (ins) => {
            const a = fromBits(ins.slice(0, 4) as (0 | 1)[])
            const result = ((~a) + 1) & 0xF
            const ovf: 0 | 1 = a === 0x8 ? 1 : 0
            return [...toBits(result, 4), ovf]
        },
    },

    // ── Absolute Value ────────────────────────────────────────────────────────

    ABS_VAL4: {
        type: 'ABS_VAL4', name: 'Abs Value (4-bit)', shortName: 'ABS4',
        description: 'Returns |A| for 4-bit two\'s complement input. If A<0 (MSB=1), outputs -A.',
        inputs: ['A3', 'A2', 'A1', 'A0'],
        outputs: ['R3', 'R2', 'R1', 'R0', 'Z'],
        category: 'convert',
        evaluate: (ins) => {
            const a = fromBits(ins.slice(0, 4) as (0 | 1)[])
            const neg = (a >> 3) & 1
            const result = neg ? (((~a) + 1) & 0xF) : a
            const z: 0 | 1 = result === 0 ? 1 : 0
            return [...toBits(result, 4), z]
        },
    },

    // ── BCD Adder ─────────────────────────────────────────────────────────────

    BCD_ADDER: {
        type: 'BCD_ADDER', name: 'BCD Adder', shortName: 'BCD+',
        description: 'BCD digit adder. Adds two BCD digits (0–9) with carry correction. Outputs a valid BCD digit sum.',
        inputs: ['A3', 'A2', 'A1', 'A0', 'B3', 'B2', 'B1', 'B0', 'Cin'],
        outputs: ['S3', 'S2', 'S1', 'S0', 'Cout'],
        category: 'convert',
        evaluate: (ins) => {
            const a = fromBits(ins.slice(0, 4) as (0 | 1)[])
            const b = fromBits(ins.slice(4, 8) as (0 | 1)[])
            const cin = ins[8] ?? 0
            let sum = a + b + (cin as number)
            let cout = 0
            if (sum > 9) { sum += 6; cout = 1 }
            if (sum > 0xF) { sum &= 0xF; cout = 1 }
            return [...toBits(sum & 0xF, 4), cout as 0 | 1]
        },
    },
}

// ─── Public helpers ───────────────────────────────────────────────────────────
export function evaluateAlu(type: AluType, inputs: (0 | 1)[]): (0 | 1)[] {
    return ALU_DEFS[type]?.evaluate(inputs) ?? []
}

export const ALU_ITEMS = Object.values(ALU_DEFS).map((d) => ({
    type: d.type, name: d.name, description: d.description, category: d.category,
}))
