// ─── ISA Definition ─────────────────────────────────────────────────────────
// 4-bit SimpleISA CPU
// Instruction format (8 bits): [7:4]=opcode, [3:0]=operand
// For 2-reg ops: [3:2]=Rd, [1:0]=Rs
// For immediate: [3:2]=Rd, [1:0]=imm (0–3)
// For jumps: [3:0]=addr (0–15)

export type CpuType = 'CPU_4BIT'

export interface CpuFlags { Z: 0 | 1; N: 0 | 1; C: 0 | 1 }

export interface CpuState {
    registers: [number, number, number, number]  // R0, R1, R2, R3 (4-bit each)
    pc: number      // program counter (0–15)
    ir: number      // instruction register (last fetched)
    flags: CpuFlags
    output: number  // value last written by OUT
    halted: boolean
    cycle: number
    prevClk: 0 | 1
    program: number[]  // 16 instruction bytes
    executionLog: string[]
}

export const OPCODES: Record<number, string> = {
    0x0: 'NOP', 0x1: 'LOAD', 0x2: 'MOV', 0x3: 'ADD',
    0x4: 'SUB', 0x5: 'AND', 0x6: 'OR', 0x7: 'XOR',
    0x8: 'NOT', 0x9: 'INC', 0xA: 'DEC', 0xB: 'JMP',
    0xC: 'JZ', 0xD: 'JN', 0xE: 'OUT', 0xF: 'HLT',
}

const REGS = ['R0', 'R1', 'R2', 'R3']

export const DEFAULT_PROGRAM: number[] = [
    0x10, // LOAD R0, #0  (R0 = 0)
    0x1B, // LOAD R2, #3  (R2 = 3)  — loop limit
    // LOOP:
    0x90, // INC R0
    0xE0, // OUT R0
    0x30, // ADD R0, R0  (double — for demo)
    0xB2, // JMP 2  (back to LOOP at addr 2)
    0xF0, // HLT
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]

// ─── Disassembler ─────────────────────────────────────────────────────────────
export function disassemble(instr: number): string {
    const op = (instr >> 4) & 0xF
    const operand = instr & 0xF
    const rd = REGS[(operand >> 2) & 3]
    const rs = REGS[operand & 3]
    const imm = operand & 3
    const addr = operand

    switch (op) {
        case 0x0: return 'NOP'
        case 0x1: return `LOAD ${rd}, #${imm}`
        case 0x2: return `MOV ${rd}, ${rs}`
        case 0x3: return `ADD ${rd}, ${rs}`
        case 0x4: return `SUB ${rd}, ${rs}`
        case 0x5: return `AND ${rd}, ${rs}`
        case 0x6: return `OR  ${rd}, ${rs}`
        case 0x7: return `XOR ${rd}, ${rs}`
        case 0x8: return `NOT ${rd}`
        case 0x9: return `INC ${rd}`
        case 0xA: return `DEC ${rd}`
        case 0xB: return `JMP ${addr.toString(16).toUpperCase()}`
        case 0xC: return `JZ  ${addr.toString(16).toUpperCase()}`
        case 0xD: return `JN  ${addr.toString(16).toUpperCase()}`
        case 0xE: return `OUT ${rd}`
        case 0xF: return 'HLT'
        default: return `??? ${instr.toString(16).toUpperCase().padStart(2, '0')}`
    }
}

// ─── CPU Step ─────────────────────────────────────────────────────────────────
export function cpuStep(state: CpuState): CpuState {
    if (state.halted) return state

    const ir = state.program[state.pc] ?? 0xF0
    const op = (ir >> 4) & 0xF
    const operand = ir & 0xF
    const rd_idx = (operand >> 2) & 3
    const rs_idx = operand & 3

    let regs: [number, number, number, number] = [...state.registers] as [number, number, number, number]
    let pc = (state.pc + 1) & 0xF
    let flags = { ...state.flags }
    let output = state.output
    let halted = false

    switch (op) {
        case 0x0: break  // NOP

        case 0x1: {  // LOAD Rd, #imm2
            const imm = operand & 3
            regs[rd_idx] = imm
            flags.Z = imm === 0 ? 1 : 0; flags.N = 0; flags.C = 0
            break
        }
        case 0x2:  // MOV Rd, Rs
            regs[rd_idx] = regs[rs_idx]
            break

        case 0x3: {  // ADD Rd, Rs
            const sum = regs[rd_idx] + regs[rs_idx]
            flags.C = (sum > 0xF) ? 1 : 0
            regs[rd_idx] = sum & 0xF
            flags.Z = regs[rd_idx] === 0 ? 1 : 0
            flags.N = ((regs[rd_idx] >> 3) & 1) as 0 | 1
            break
        }
        case 0x4: {  // SUB Rd, Rs
            const diff = (regs[rd_idx] - regs[rs_idx]) & 0xF
            regs[rd_idx] = diff
            flags.Z = diff === 0 ? 1 : 0
            flags.N = ((diff >> 3) & 1) as 0 | 1
            flags.C = 0
            break
        }
        case 0x5:  // AND Rd, Rs
            regs[rd_idx] = (regs[rd_idx] & regs[rs_idx]) & 0xF
            flags.Z = regs[rd_idx] === 0 ? 1 : 0; flags.N = ((regs[rd_idx] >> 3) & 1) as 0 | 1
            break

        case 0x6:  // OR Rd, Rs
            regs[rd_idx] = (regs[rd_idx] | regs[rs_idx]) & 0xF
            flags.Z = regs[rd_idx] === 0 ? 1 : 0; flags.N = ((regs[rd_idx] >> 3) & 1) as 0 | 1
            break

        case 0x7:  // XOR Rd, Rs
            regs[rd_idx] = (regs[rd_idx] ^ regs[rs_idx]) & 0xF
            flags.Z = regs[rd_idx] === 0 ? 1 : 0; flags.N = ((regs[rd_idx] >> 3) & 1) as 0 | 1
            break

        case 0x8:  // NOT Rd
            regs[rd_idx] = (~regs[rd_idx]) & 0xF
            flags.Z = regs[rd_idx] === 0 ? 1 : 0; flags.N = ((regs[rd_idx] >> 3) & 1) as 0 | 1
            break

        case 0x9: {  // INC Rd
            const val = (regs[rd_idx] + 1)
            flags.C = val > 0xF ? 1 : 0
            regs[rd_idx] = val & 0xF
            flags.Z = regs[rd_idx] === 0 ? 1 : 0; flags.N = ((regs[rd_idx] >> 3) & 1) as 0 | 1
            break
        }
        case 0xA: {  // DEC Rd
            regs[rd_idx] = (regs[rd_idx] - 1) & 0xF
            flags.Z = regs[rd_idx] === 0 ? 1 : 0; flags.N = ((regs[rd_idx] >> 3) & 1) as 0 | 1
            break
        }
        case 0xB:  // JMP addr
            pc = operand
            break

        case 0xC:  // JZ addr
            if (flags.Z) pc = operand
            break

        case 0xD:  // JN addr
            if (flags.N) pc = operand
            break

        case 0xE:  // OUT Rd
            output = regs[rd_idx]
            break

        case 0xF:  // HLT
            halted = true
            pc = state.pc  // don't advance
            break
    }

    const mnemonic = disassemble(ir)
    const logEntry =
        `[${state.pc.toString(16).toUpperCase().padStart(2, '0')}] ${mnemonic.padEnd(14)} | ` +
        `R0=${regs[0].toString(16).toUpperCase()} R1=${regs[1].toString(16).toUpperCase()} ` +
        `R2=${regs[2].toString(16).toUpperCase()} R3=${regs[3].toString(16).toUpperCase()} ` +
        `Z=${flags.Z} N=${flags.N} C=${flags.C}`

    return {
        ...state,
        registers: regs,
        pc,
        ir,
        flags,
        output,
        halted,
        cycle: state.cycle + 1,
        executionLog: [...state.executionLog, logEntry].slice(-64),
    }
}

// ─── Clock-driven evaluate ────────────────────────────────────────────────────
export function evaluateCpu(
    inputs: (0 | 1)[],  // [CLK, RST]
    state: CpuState
): { state: CpuState; outputs: (0 | 1)[] } {
    const clk = inputs[0] ?? 0
    const rst = inputs[1] ?? 0

    let next = state

    if (rst === 1) {
        next = {
            ...state,
            registers: [0, 0, 0, 0],
            pc: 0, ir: 0,
            flags: { Z: 0, N: 0, C: 0 },
            output: 0, halted: false, cycle: 0,
            executionLog: ['[RESET]'],
            prevClk: clk as 0 | 1,
        }
    } else if (state.prevClk === 0 && clk === 1) {
        next = { ...cpuStep(state), prevClk: 1 }
    } else {
        next = { ...state, prevClk: clk as 0 | 1 }
    }

    // Outputs: [OUT3, OUT2, OUT1, OUT0, Z, N, C, HLT]
    const outBits: (0 | 1)[] = [
        ((next.output >> 3) & 1) as 0 | 1,
        ((next.output >> 2) & 1) as 0 | 1,
        ((next.output >> 1) & 1) as 0 | 1,
        (next.output & 1) as 0 | 1,
        next.flags.Z, next.flags.N, next.flags.C,
        next.halted ? 1 : 0,
    ]

    return { state: next, outputs: outBits }
}

// ─── Two-pass Assembler ──────────────────────────────────────────────────────
export interface AssembleResult {
    program: number[]
    errors: string[]
    lineMap: Map<number, number>  // addr → source line index
}

const MNEMONIC_OPS: Record<string, number> = {
    NOP: 0x0, LOAD: 0x1, MOV: 0x2, ADD: 0x3, SUB: 0x4,
    AND: 0x5, OR: 0x6, XOR: 0x7, NOT: 0x8, INC: 0x9,
    DEC: 0xA, JMP: 0xB, JZ: 0xC, JN: 0xD, OUT: 0xE, HLT: 0xF,
}
const REG_IDX: Record<string, number> = { R0: 0, R1: 1, R2: 2, R3: 3 }

export function assembleCpu(source: string): AssembleResult {
    const lines = source.split('\n')
    const errors: string[] = []
    const lineMap = new Map<number, number>()
    const labels = new Map<string, number>()
    const instructions: { op: number; operand: number | string; line: number }[] = []

    // Pass 1: collect labels, parse instructions
    for (let li = 0; li < lines.length; li++) {
        const raw = lines[li]
        const stripped = raw.replace(/;.*/, '').trim()  // strip comments
        if (!stripped) continue

        // Label?
        if (stripped.endsWith(':')) {
            const lname = stripped.slice(0, -1).toUpperCase()
            labels.set(lname, instructions.length)
            continue
        }

        // Instruction (may have trailing label)
        const parts = stripped.split(/\s+,?\s*|,/).map((p) => p.trim()).filter(Boolean)
        const mnem = parts[0].toUpperCase()

        if (!(mnem in MNEMONIC_OPS)) {
            errors.push(`Line ${li + 1}: Unknown mnemonic '${mnem}'`)
            continue
        }

        const op = MNEMONIC_OPS[mnem]!
        let operand: number | string = 0

        switch (mnem) {
            case 'NOP': case 'HLT':
                operand = 0
                break

            case 'LOAD': {
                const rd = REG_IDX[parts[1]?.toUpperCase() ?? '']
                const immStr = parts[2]?.replace('#', '') ?? '0'
                const imm = parseInt(immStr, 10)
                if (rd === undefined) { errors.push(`Line ${li + 1}: Invalid register '${parts[1]}'`); break }
                if (isNaN(imm) || imm < 0 || imm > 3) { errors.push(`Line ${li + 1}: Immediate must be 0–3`); break }
                operand = (rd << 2) | (imm & 3)
                break
            }

            case 'MOV': case 'ADD': case 'SUB': case 'AND': case 'OR': case 'XOR': {
                const rd = REG_IDX[parts[1]?.toUpperCase() ?? '']
                const rs = REG_IDX[parts[2]?.toUpperCase() ?? '']
                if (rd === undefined || rs === undefined) { errors.push(`Line ${li + 1}: Invalid registers`); break }
                operand = (rd << 2) | (rs & 3)
                break
            }

            case 'NOT': case 'INC': case 'DEC': case 'OUT': {
                const rd = REG_IDX[parts[1]?.toUpperCase() ?? '']
                if (rd === undefined) { errors.push(`Line ${li + 1}: Invalid register '${parts[1]}'`); break }
                operand = rd << 2
                break
            }

            case 'JMP': case 'JZ': case 'JN': {
                const target = parts[1]?.toUpperCase() ?? '0'
                const numericAddr = parseInt(target, 16)
                if (!isNaN(numericAddr)) {
                    operand = numericAddr & 0xF
                } else {
                    operand = target  // label, resolve in pass 2
                }
                break
            }
        }

        lineMap.set(instructions.length, li)
        instructions.push({ op, operand, line: li })
    }

    // Pass 2: resolve labels, encode
    const program = Array(16).fill(0x00)
    for (let i = 0; i < Math.min(instructions.length, 16); i++) {
        const { op, operand, line } = instructions[i]
        let resolvedOperand = operand

        if (typeof operand === 'string') {
            const addr = labels.get(operand)
            if (addr === undefined) {
                errors.push(`Line ${line + 1}: Undefined label '${operand}'`)
                resolvedOperand = 0
            } else {
                resolvedOperand = addr & 0xF
            }
        }

        program[i] = ((op & 0xF) << 4) | ((resolvedOperand as number) & 0xF)
    }

    if (instructions.length > 16) {
        errors.push('Program exceeds 16 instruction limit — truncated')
    }

    return { program, errors, lineMap }
}

// ─── Default CPU State ────────────────────────────────────────────────────────
export function makeCpuState(program = DEFAULT_PROGRAM): CpuState {
    return {
        registers: [0, 0, 0, 0],
        pc: 0, ir: 0,
        flags: { Z: 0, N: 0, C: 0 },
        output: 0, halted: false, cycle: 0,
        prevClk: 0,
        program: [...program, ...Array(16).fill(0)].slice(0, 16),
        executionLog: [],
    }
}

// ─── Default assembly source ──────────────────────────────────────────────────
export const DEFAULT_SOURCE = `; 4-bit SimpleISA — counting loop
; Registers: R0 R1 R2 R3 (4-bit each)
; Immediates: #0 to #3 only

START:
  LOAD R0, #0   ; R0 = 0
  LOAD R1, #1   ; R1 = 1 (step)
LOOP:
  ADD  R0, R1   ; R0 = R0 + R1
  OUT  R0       ; output R0
  JMP  LOOP     ; repeat forever
  HLT           ; unreachable
`
