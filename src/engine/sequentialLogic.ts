// ─── Types ────────────────────────────────────────────────────────────────────
export type SeqType =
    | 'SR_LATCH' | 'D_LATCH'
    | 'DFF' | 'JKFF' | 'TFF'
    | 'REG_4' | 'REG_8'
    | 'CTR_UP4' | 'CTR_DOWN4' | 'CTR_UPDOWN' | 'CTR_BCD'
    | 'SHIFT_SIPO' | 'SHIFT_SISO' | 'RING_CTR'

export interface SeqState {
    Q: (0 | 1)[]   // multi-bit state; index 0 = MSB
    prevClk: 0 | 1  // previous clock value for edge detection
}

export interface SeqDef {
    type: SeqType
    name: string
    shortName: string
    description: string
    inputs: string[]
    outputs: string[]
    hasClk: boolean         // whether CLK input is present
    isAsynchronous: boolean // true = responds immediately; false = edge triggered
    initState: SeqState
    evaluate: (inputs: (0 | 1)[], state: SeqState) => { state: SeqState; outputs: (0 | 1)[] }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const b = (v: boolean): 0 | 1 => (v ? 1 : 0)
const bar = (v: 0 | 1): 0 | 1 => (v === 0 ? 1 : 0)
const risingEdge = (state: SeqState, clk: 0 | 1) => state.prevClk === 0 && clk === 1

function bitArray(val: number, width: number): (0 | 1)[] {
    return Array.from({ length: width }, (_, i) => (((val >> (width - 1 - i)) & 1) === 1 ? 1 : 0))
}
function fromBits(bits: (0 | 1)[]): number {
    return bits.reduce((acc, b, i) => acc | (b << (bits.length - 1 - i)), 0)
}

// ─── Definitions ─────────────────────────────────────────────────────────────
export const SEQ_DEFS: Record<SeqType, SeqDef> = {

    // ── Latches ────────────────────────────────────────────────────────────────

    SR_LATCH: {
        type: 'SR_LATCH', name: 'SR Latch', shortName: 'SR',
        description: 'NOR-based asynchronous SR latch. S=1 sets Q=1; R=1 resets Q=0. S=R=1 is invalid.',
        inputs: ['S', 'R'],
        outputs: ['Q', 'Q̄'],
        hasClk: false, isAsynchronous: true,
        initState: { Q: [0], prevClk: 0 },
        evaluate: ([s = 0, r = 0], state) => {
            let Q = state.Q[0] ?? 0
            if (s === 1 && r === 0) Q = 1
            else if (s === 0 && r === 1) Q = 0
            else if (s === 1 && r === 1) Q = state.Q[0] ?? 0  // invalid — hold
            // s=0,r=0 → hold
            const newState: SeqState = { Q: [Q], prevClk: state.prevClk }
            return { state: newState, outputs: [Q, bar(Q)] }
        },
    },

    D_LATCH: {
        type: 'D_LATCH', name: 'D Latch', shortName: 'DL',
        description: 'Level-triggered D latch. When Enable=1, Q follows D. When Enable=0, Q holds.',
        inputs: ['EN', 'D'],
        outputs: ['Q', 'Q̄'],
        hasClk: false, isAsynchronous: true,
        initState: { Q: [0], prevClk: 0 },
        evaluate: ([en = 0, d = 0], state) => {
            const Q: 0 | 1 = en === 1 ? d as 0 | 1 : (state.Q[0] ?? 0)
            const newState: SeqState = { Q: [Q], prevClk: state.prevClk }
            return { state: newState, outputs: [Q, bar(Q)] }
        },
    },

    // ── Flip-Flops ─────────────────────────────────────────────────────────────

    DFF: {
        type: 'DFF', name: 'D Flip-Flop', shortName: 'DFF',
        description: 'Edge-triggered D flip-flop with async reset. On rising CLK: Q ← D. /CLR=0 resets Q.',
        inputs: ['CLK', 'D', '/CLR'],
        outputs: ['Q', 'Q̄'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0], prevClk: 0 },
        evaluate: ([clk = 0, d = 0, nclr = 1], state) => {
            let Q = state.Q[0] ?? 0
            if (nclr === 0) {
                Q = 0  // async reset
            } else if (risingEdge(state, clk as 0 | 1)) {
                Q = d as 0 | 1
            }
            const newState: SeqState = { Q: [Q], prevClk: clk as 0 | 1 }
            return { state: newState, outputs: [Q, bar(Q)] }
        },
    },

    JKFF: {
        type: 'JKFF', name: 'JK Flip-Flop', shortName: 'JKFF',
        description: 'Edge-triggered JK flip-flop. J=K=0: Hold. J=0,K=1: Reset. J=1,K=0: Set. J=K=1: Toggle.',
        inputs: ['CLK', 'J', 'K', '/CLR'],
        outputs: ['Q', 'Q̄'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0], prevClk: 0 },
        evaluate: ([clk = 0, j = 0, k = 0, nclr = 1], state) => {
            let Q = state.Q[0] ?? 0
            if (nclr === 0) {
                Q = 0  // async reset
            } else if (risingEdge(state, clk as 0 | 1)) {
                if (j === 0 && k === 0) { /* hold */ }
                else if (j === 0 && k === 1) Q = 0
                else if (j === 1 && k === 0) Q = 1
                else Q = bar(Q)  // J=K=1: toggle
            }
            const newState: SeqState = { Q: [Q], prevClk: clk as 0 | 1 }
            return { state: newState, outputs: [Q, bar(Q)] }
        },
    },

    TFF: {
        type: 'TFF', name: 'T Flip-Flop', shortName: 'TFF',
        description: 'Edge-triggered T flip-flop. On rising CLK: If T=1, toggle; else hold.',
        inputs: ['CLK', 'T', '/CLR'],
        outputs: ['Q', 'Q̄'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0], prevClk: 0 },
        evaluate: ([clk = 0, t = 0, nclr = 1], state) => {
            let Q = state.Q[0] ?? 0
            if (nclr === 0) {
                Q = 0
            } else if (risingEdge(state, clk as 0 | 1) && t === 1) {
                Q = bar(Q)
            }
            const newState: SeqState = { Q: [Q], prevClk: clk as 0 | 1 }
            return { state: newState, outputs: [Q, bar(Q)] }
        },
    },

    // ── Registers ──────────────────────────────────────────────────────────────

    REG_4: {
        type: 'REG_4', name: '4-bit Register', shortName: 'REG4',
        description: '4-bit parallel load register. On rising CLK (when /LD=0): Q ← D. /CLR resets.',
        inputs: ['CLK', 'D3', 'D2', 'D1', 'D0', '/CLR', '/LD'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0, 0, 0, 0], prevClk: 0 },
        evaluate: ([clk = 0, d3 = 0, d2 = 0, d1 = 0, d0 = 0, nclr = 1, nld = 0], state) => {
            let Q = [...state.Q] as (0 | 1)[]
            if (nclr === 0) {
                Q = [0, 0, 0, 0]
            } else if (risingEdge(state, clk as 0 | 1) && nld === 0) {
                Q = [d3 as 0 | 1, d2 as 0 | 1, d1 as 0 | 1, d0 as 0 | 1]
            }
            const newState: SeqState = { Q, prevClk: clk as 0 | 1 }
            return { state: newState, outputs: [...Q] }
        },
    },

    REG_8: {
        type: 'REG_8', name: '8-bit Register', shortName: 'REG8',
        description: '8-bit parallel load register. On rising CLK (when /LD=0): Q ← D. /CLR resets.',
        inputs: ['CLK', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0', '/CLR', '/LD'],
        outputs: ['Q7', 'Q6', 'Q5', 'Q4', 'Q3', 'Q2', 'Q1', 'Q0'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0, 0, 0, 0, 0, 0, 0, 0], prevClk: 0 },
        evaluate: ([clk = 0, ...rest], state) => {
            const D = rest.slice(0, 8) as (0 | 1)[]
            const nclr = rest[8] ?? 1; const nld = rest[9] ?? 0
            let Q = [...state.Q] as (0 | 1)[]
            if (nclr === 0) {
                Q = Array(8).fill(0) as (0 | 1)[]
            } else if (risingEdge(state, clk as 0 | 1) && nld === 0) {
                Q = D
            }
            return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [...Q] }
        },
    },

    // ── Counters ───────────────────────────────────────────────────────────────

    CTR_UP4: {
        type: 'CTR_UP4', name: '4-bit Up Counter', shortName: 'UP4',
        description: '4-bit synchronous up counter. Counts 0→15 on rising CLK when EN=1. /CLR resets.',
        inputs: ['CLK', '/CLR', 'EN'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0', 'RCO'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0, 0, 0, 0], prevClk: 0 },
        evaluate: ([clk = 0, nclr = 1, en = 1], state) => {
            let Q = [...state.Q] as (0 | 1)[]
            if (nclr === 0) {
                Q = [0, 0, 0, 0]
            } else if (risingEdge(state, clk as 0 | 1) && en === 1) {
                const next = (fromBits(Q) + 1) & 0xF
                Q = bitArray(next, 4) as (0 | 1)[]
            }
            const rco: 0 | 1 = fromBits(Q) === 15 ? 1 : 0
            return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [...Q, rco] }
        },
    },

    CTR_DOWN4: {
        type: 'CTR_DOWN4', name: '4-bit Down Counter', shortName: 'DN4',
        description: '4-bit synchronous down counter. Counts 15→0 on rising CLK when EN=1. /CLR resets.',
        inputs: ['CLK', '/CLR', 'EN'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0', 'BRW'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [1, 1, 1, 1], prevClk: 0 },
        evaluate: ([clk = 0, nclr = 1, en = 1], state) => {
            let Q = [...state.Q] as (0 | 1)[]
            if (nclr === 0) {
                Q = [0, 0, 0, 0]
            } else if (risingEdge(state, clk as 0 | 1) && en === 1) {
                const next = (fromBits(Q) - 1) & 0xF
                Q = bitArray(next, 4) as (0 | 1)[]
            }
            const brw: 0 | 1 = fromBits(Q) === 0 ? 1 : 0
            return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [...Q, brw] }
        },
    },

    CTR_UPDOWN: {
        type: 'CTR_UPDOWN', name: 'Up/Down Counter', shortName: 'UD4',
        description: '4-bit up/down counter. U/D=1: count up; U/D=0: count down. /CLR resets.',
        inputs: ['CLK', '/CLR', 'EN', 'U/D'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0', 'RCO'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0, 0, 0, 0], prevClk: 0 },
        evaluate: ([clk = 0, nclr = 1, en = 1, ud = 1], state) => {
            let Q = [...state.Q] as (0 | 1)[]
            if (nclr === 0) {
                Q = [0, 0, 0, 0]
            } else if (risingEdge(state, clk as 0 | 1) && en === 1) {
                const cur = fromBits(Q)
                const next = ud === 1 ? (cur + 1) & 0xF : (cur - 1) & 0xF
                Q = bitArray(next, 4) as (0 | 1)[]
            }
            const val = fromBits(Q)
            const rco: 0 | 1 = (ud === 1 && val === 15) || (ud === 0 && val === 0) ? 1 : 0
            return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [...Q, rco] }
        },
    },

    CTR_BCD: {
        type: 'CTR_BCD', name: 'BCD Counter', shortName: 'BCD',
        description: 'Decade (BCD) counter mod-10. Counts 0→9, wraps to 0. /CLR resets.',
        inputs: ['CLK', '/CLR', 'EN'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0', 'TC'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0, 0, 0, 0], prevClk: 0 },
        evaluate: ([clk = 0, nclr = 1, en = 1], state) => {
            let Q = [...state.Q] as (0 | 1)[]
            if (nclr === 0) {
                Q = [0, 0, 0, 0]
            } else if (risingEdge(state, clk as 0 | 1) && en === 1) {
                const next = (fromBits(Q) + 1) % 10
                Q = bitArray(next, 4) as (0 | 1)[]
            }
            const tc: 0 | 1 = fromBits(Q) === 9 ? 1 : 0
            return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [...Q, tc] }
        },
    },

    // ── Shift Registers ────────────────────────────────────────────────────────

    SHIFT_SIPO: {
        type: 'SHIFT_SIPO', name: 'SIPO Shift Reg', shortName: 'SIPO',
        description: '4-bit Serial-In Parallel-Out shift register. Shifts in Dᵢₙ on rising CLK.',
        inputs: ['CLK', 'Dᵢₙ', '/CLR'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0, 0, 0, 0], prevClk: 0 },
        evaluate: ([clk = 0, din = 0, nclr = 1], state) => {
            let Q = [...state.Q] as (0 | 1)[]
            if (nclr === 0) {
                Q = [0, 0, 0, 0]
            } else if (risingEdge(state, clk as 0 | 1)) {
                Q = [din as 0 | 1, Q[0] ?? 0, Q[1] ?? 0, Q[2] ?? 0]
            }
            return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [...Q] }
        },
    },

    SHIFT_SISO: {
        type: 'SHIFT_SISO', name: 'SISO Shift Reg', shortName: 'SISO',
        description: '4-bit Serial-In Serial-Out shift register. Dout = Q[3] (oldest bit).',
        inputs: ['CLK', 'Dᵢₙ', '/CLR'],
        outputs: ['Dₒᵤₜ'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [0, 0, 0, 0], prevClk: 0 },
        evaluate: ([clk = 0, din = 0, nclr = 1], state) => {
            let Q = [...state.Q] as (0 | 1)[]
            if (nclr === 0) {
                Q = [0, 0, 0, 0]
            } else if (risingEdge(state, clk as 0 | 1)) {
                const dout = Q[3] ?? 0
                Q = [din as 0 | 1, Q[0] ?? 0, Q[1] ?? 0, Q[2] ?? 0]
                return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [dout] }
            }
            return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [Q[3] ?? 0] }
        },
    },

    RING_CTR: {
        type: 'RING_CTR', name: 'Ring Counter', shortName: 'RING',
        description: '4-bit ring counter. Rotate-left on rising CLK. LOAD=1 loads D3-D0.',
        inputs: ['CLK', 'LOAD', 'D3', 'D2', 'D1', 'D0'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0'],
        hasClk: true, isAsynchronous: false,
        initState: { Q: [1, 0, 0, 0], prevClk: 0 },
        evaluate: ([clk = 0, load = 0, d3 = 0, d2 = 0, d1 = 0, d0 = 0], state) => {
            let Q = [...state.Q] as (0 | 1)[]
            if (load === 1) {
                Q = [d3 as 0 | 1, d2 as 0 | 1, d1 as 0 | 1, d0 as 0 | 1]
            } else if (risingEdge(state, clk as 0 | 1)) {
                // Rotate left: Q3←Q0 (wrap)
                Q = [Q[1] ?? 0, Q[2] ?? 0, Q[3] ?? 0, Q[0] ?? 0]
            }
            return { state: { Q, prevClk: clk as 0 | 1 }, outputs: [...Q] }
        },
    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function evaluateSeq(
    type: SeqType,
    inputs: (0 | 1)[],
    state: SeqState
): { state: SeqState; outputs: (0 | 1)[] } {
    return SEQ_DEFS[type]?.evaluate(inputs, state) ?? { state, outputs: [] }
}

export const SEQ_ITEMS = Object.values(SEQ_DEFS).map((d) => ({
    type: d.type,
    name: d.name,
    description: d.description,
    hasClk: d.hasClk,
}))
