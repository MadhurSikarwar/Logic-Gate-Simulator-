// ─── Types ────────────────────────────────────────────────────────────────────
export type MemType =
    | 'ROM_8x1' | 'ROM_16x4' | 'ROM_32x8'
    | 'RAM_8x1' | 'RAM_16x4'
    | 'REG_FILE' | 'STACK' | 'FIFO'

export interface MemState {
    data: number[]    // memory array (index = address, value = data word)
    sp: number        // stack pointer (STACK)
    rp: number        // read pointer (FIFO)
    wp: number        // write pointer (FIFO)
    count: number     // items in FIFO / STACK
    prevClk: 0 | 1
}

export interface MemDef {
    type: MemType
    name: string
    shortName: string
    description: string
    inputs: string[]
    outputs: string[]
    memSize: number     // number of addressable locations
    dataWidth: number   // bits per location
    isROM: boolean
    hasClk: boolean
    initState: MemState
    evaluate: (inputs: (0 | 1)[], state: MemState) => { state: MemState; outputs: (0 | 1)[] }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const b = (v: boolean): 0 | 1 => (v ? 1 : 0)

function toAddr(bits: (0 | 1)[]): number {
    return bits.reduce((acc: number, v, i) => acc | ((v as number) << (bits.length - 1 - i)), 0)
}

function toWord(bits: (0 | 1)[]): number {
    return bits.reduce((acc: number, v, i) => acc | ((v as number) << (bits.length - 1 - i)), 0)
}

function toBits(val: number, width: number): (0 | 1)[] {
    return Array.from({ length: width }, (_, i) =>
        (((val >>> (width - 1 - i)) & 1) === 1 ? 1 : 0)
    )
}

function risingEdge(state: MemState, clk: 0 | 1): boolean {
    return state.prevClk === 0 && clk === 1
}

function initMem(size: number): number[] {
    return Array(size).fill(0)
}

// ─── Definitions ─────────────────────────────────────────────────────────────
export const MEM_DEFS: Record<MemType, MemDef> = {

    // ── ROM ───────────────────────────────────────────────────────────────────

    ROM_8x1: {
        type: 'ROM_8x1', name: 'ROM 8×1', shortName: 'ROM8',
        description: '8-word × 1-bit Read-Only Memory. Address A[2:0] reads 1 bit. Double-click to edit data.',
        inputs: ['A2', 'A1', 'A0', '/OE'],
        outputs: ['D'],
        memSize: 8, dataWidth: 1, isROM: true, hasClk: false,
        initState: { data: [0, 1, 0, 1, 0, 1, 0, 1], sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0 },
        evaluate: ([a2 = 0, a1 = 0, a0 = 0, noe = 0], state) => {
            const addr = toAddr([a2 as 0 | 1, a1 as 0 | 1, a0 as 0 | 1])
            const val = noe === 0 ? (state.data[addr] ?? 0) & 1 : 0
            return { state, outputs: [val as 0 | 1] }
        },
    },

    ROM_16x4: {
        type: 'ROM_16x4', name: 'ROM 16×4', shortName: 'ROM16',
        description: '16-word × 4-bit ROM. A[3:0] selects address, outputs 4-bit data nibble.',
        inputs: ['A3', 'A2', 'A1', 'A0', '/OE'],
        outputs: ['D3', 'D2', 'D1', 'D0'],
        memSize: 16, dataWidth: 4, isROM: true, hasClk: false,
        initState: {
            data: [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xA, 0xB, 0xC, 0xD, 0xE, 0xF],
            sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0,
        },
        evaluate: ([a3 = 0, a2 = 0, a1 = 0, a0 = 0, noe = 0], state) => {
            const addr = toAddr([a3 as 0 | 1, a2 as 0 | 1, a1 as 0 | 1, a0 as 0 | 1])
            const val = noe === 0 ? (state.data[addr] ?? 0) & 0xF : 0
            return { state, outputs: toBits(val, 4) }
        },
    },

    ROM_32x8: {
        type: 'ROM_32x8', name: 'ROM 32×8', shortName: 'ROM32',
        description: '32-word × 8-bit ROM. A[4:0] addresses a full byte. Program via Memory Viewer.',
        inputs: ['A4', 'A3', 'A2', 'A1', 'A0', '/OE'],
        outputs: ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'],
        memSize: 32, dataWidth: 8, isROM: true, hasClk: false,
        initState: {
            data: Array.from({ length: 32 }, (_, i) => i),
            sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0,
        },
        evaluate: (ins, state) => {
            const addrBits = ins.slice(0, 5) as (0 | 1)[]
            const noe = ins[5] ?? 0
            const addr = toAddr(addrBits)
            const val = noe === 0 ? (state.data[addr] ?? 0) & 0xFF : 0
            return { state, outputs: toBits(val, 8) }
        },
    },

    // ── RAM ───────────────────────────────────────────────────────────────────

    RAM_8x1: {
        type: 'RAM_8x1', name: 'RAM 8×1', shortName: 'RAM8',
        description: '8-word × 1-bit synchronous SRAM. On rising CLK with /WE=0: RAM[A] ← D_in.',
        inputs: ['CLK', 'A2', 'A1', 'A0', 'D', '/WE'],
        outputs: ['Q'],
        memSize: 8, dataWidth: 1, isROM: false, hasClk: true,
        initState: { data: initMem(8), sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0 },
        evaluate: ([clk = 0, a2 = 0, a1 = 0, a0 = 0, din = 0, nwe = 0], state) => {
            const addr = toAddr([a2 as 0 | 1, a1 as 0 | 1, a0 as 0 | 1])
            let data = [...state.data]
            if (risingEdge(state, clk as 0 | 1) && nwe === 0) {
                data = [...data]
                data[addr] = din as number
            }
            const q = (data[addr] ?? 0) as 0 | 1
            return { state: { ...state, data, prevClk: clk as 0 | 1 }, outputs: [q] }
        },
    },

    RAM_16x4: {
        type: 'RAM_16x4', name: 'RAM 16×4', shortName: 'RAM16',
        description: '16-word × 4-bit synchronous SRAM. Rising CLK + /WE=0 writes 4-bit data.',
        inputs: ['CLK', 'A3', 'A2', 'A1', 'A0', 'D3', 'D2', 'D1', 'D0', '/WE'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0'],
        memSize: 16, dataWidth: 4, isROM: false, hasClk: true,
        initState: { data: initMem(16), sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0 },
        evaluate: ([clk = 0, a3 = 0, a2 = 0, a1 = 0, a0 = 0, d3 = 0, d2 = 0, d1 = 0, d0 = 0, nwe = 0], state) => {
            const addr = toAddr([a3 as 0 | 1, a2 as 0 | 1, a1 as 0 | 1, a0 as 0 | 1])
            const din = toWord([d3 as 0 | 1, d2 as 0 | 1, d1 as 0 | 1, d0 as 0 | 1])
            let data = [...state.data]
            if (risingEdge(state, clk as 0 | 1) && nwe === 0) {
                data = [...data]; data[addr] = din & 0xF
            }
            const q = (data[addr] ?? 0) & 0xF
            return { state: { ...state, data, prevClk: clk as 0 | 1 }, outputs: toBits(q, 4) }
        },
    },

    // ── Register File ─────────────────────────────────────────────────────────

    REG_FILE: {
        type: 'REG_FILE', name: 'Register File', shortName: 'REGS',
        description: '4-register × 4-bit register file. WA selects write register, RA selects read register.',
        inputs: ['CLK', 'WE', 'WA1', 'WA0', 'D3', 'D2', 'D1', 'D0', 'RA1', 'RA0'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0'],
        memSize: 4, dataWidth: 4, isROM: false, hasClk: true,
        initState: { data: [0, 0, 0, 0], sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0 },
        evaluate: ([clk = 0, we = 0, wa1 = 0, wa0 = 0, d3 = 0, d2 = 0, d1 = 0, d0 = 0, ra1 = 0, ra0 = 0], state) => {
            const wa = toAddr([wa1 as 0 | 1, wa0 as 0 | 1])
            const ra = toAddr([ra1 as 0 | 1, ra0 as 0 | 1])
            const din = toWord([d3 as 0 | 1, d2 as 0 | 1, d1 as 0 | 1, d0 as 0 | 1])
            let data = [...state.data]
            if (risingEdge(state, clk as 0 | 1) && we === 1) {
                data = [...data]; data[wa] = din & 0xF
            }
            const q = (data[ra] ?? 0) & 0xF
            return { state: { ...state, data, prevClk: clk as 0 | 1 }, outputs: toBits(q, 4) }
        },
    },

    // ── Stack (LIFO) ─────────────────────────────────────────────────────────

    STACK: {
        type: 'STACK', name: 'Stack (LIFO)', shortName: 'STKK',
        description: '4-deep × 4-bit LIFO stack. PUSH writes data; POP reads and removes top.',
        inputs: ['CLK', 'PUSH', 'POP', 'D3', 'D2', 'D1', 'D0'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0', 'FULL', 'EMPTY'],
        memSize: 4, dataWidth: 4, isROM: false, hasClk: true,
        initState: { data: [0, 0, 0, 0], sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0 },
        evaluate: ([clk = 0, push = 0, pop = 0, d3 = 0, d2 = 0, d1 = 0, d0 = 0], state) => {
            let { data, sp, count } = state
            const din = toWord([d3 as 0 | 1, d2 as 0 | 1, d1 as 0 | 1, d0 as 0 | 1])
            if (risingEdge(state, clk as 0 | 1)) {
                data = [...data]
                if (push === 1 && count < 4) {
                    data[sp] = din; sp = (sp + 1) & 3; count++
                } else if (pop === 1 && count > 0) {
                    sp = (sp - 1 + 4) & 3; count--
                }
            }
            const top = count > 0 ? data[(sp - 1 + 4) & 3] ?? 0 : 0
            const full: 0 | 1 = count >= 4 ? 1 : 0
            const empty: 0 | 1 = count === 0 ? 1 : 0
            return {
                state: { ...state, data, sp, count, prevClk: clk as 0 | 1 },
                outputs: [...toBits(top & 0xF, 4), full, empty],
            }
        },
    },

    // ── FIFO ─────────────────────────────────────────────────────────────────

    FIFO: {
        type: 'FIFO', name: 'FIFO Buffer', shortName: 'FIFO',
        description: '4-deep × 4-bit FIFO queue. WR enqueues, RD dequeues. Output is head of queue.',
        inputs: ['CLK', 'WR', 'RD', 'D3', 'D2', 'D1', 'D0'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0', 'FULL', 'EMPTY'],
        memSize: 4, dataWidth: 4, isROM: false, hasClk: true,
        initState: { data: [0, 0, 0, 0], sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0 },
        evaluate: ([clk = 0, wr = 0, rd = 0, d3 = 0, d2 = 0, d1 = 0, d0 = 0], state) => {
            let { data, rp, wp, count } = state
            const din = toWord([d3 as 0 | 1, d2 as 0 | 1, d1 as 0 | 1, d0 as 0 | 1])
            if (risingEdge(state, clk as 0 | 1)) {
                data = [...data]
                if (wr === 1 && count < 4) { data[wp] = din; wp = (wp + 1) & 3; count++ }
                if (rd === 1 && count > 0) { rp = (rp + 1) & 3; count-- }
            }
            const head = count > 0 ? data[rp] ?? 0 : 0
            const full: 0 | 1 = count >= 4 ? 1 : 0
            const empty: 0 | 1 = count === 0 ? 1 : 0
            return {
                state: { ...state, data, rp, wp, count, prevClk: clk as 0 | 1 },
                outputs: [...toBits(head & 0xF, 4), full, empty],
            }
        },
    },
}

// ─── Public helpers ───────────────────────────────────────────────────────────
export function evaluateMemory(
    type: MemType, inputs: (0 | 1)[], state: MemState
): { state: MemState; outputs: (0 | 1)[] } {
    return MEM_DEFS[type]?.evaluate(inputs, state) ?? { state, outputs: [] }
}

export const MEM_ITEMS = Object.values(MEM_DEFS).map((d) => ({
    type: d.type, name: d.name, description: d.description,
    memSize: d.memSize, dataWidth: d.dataWidth, isROM: d.isROM,
}))
