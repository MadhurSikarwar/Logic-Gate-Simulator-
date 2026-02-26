import type { Node, Edge } from '@xyflow/react'
import type { GateType } from '../engine/gateLogic'
import type { ComboType } from '../engine/combinationalLogic'
import type { SeqType } from '../engine/sequentialLogic'
import type { MemType } from '../engine/memoryLogic'
import type { AluType } from '../engine/aluLogic'
import { COMBO_DEFS } from '../engine/combinationalLogic'
import { SEQ_DEFS } from '../engine/sequentialLogic'
import { MEM_DEFS } from '../engine/memoryLogic'
import { ALU_DEFS } from '../engine/aluLogic'

// ─── Node classification ──────────────────────────────────────────────────────
type NodeClass = 'input' | 'output' | 'clock' | 'gate' | 'combo' | 'seq' | 'mem' | 'alu' | 'cpu' | 'unknown'

function classifyNode(node: Node): NodeClass {
    const data = node.data as Record<string, unknown>
    if (data.gateType === 'INPUT') return 'input'
    if (data.gateType === 'OUTPUT') return 'output'
    if (data.gateType === 'CLOCK') return 'clock'
    if (data.gateType) return 'gate'
    if (data.componentType) return 'combo'
    if (data.seqType) return 'seq'
    if (data.memType) return 'mem'
    if (data.aluType) return 'alu'
    if (node.type === 'cpuNode') return 'cpu'
    return 'unknown'
}

// ─── Pattern detection ────────────────────────────────────────────────────────
function detectPatterns(nodes: Node[], edges: Edge[]): string[] {
    const found: string[] = []
    const types = nodes.map((n) => (n.data as Record<string, unknown>)?.gateType as string).filter(Boolean)
    const combos = nodes.map((n) => (n.data as Record<string, unknown>)?.componentType as string).filter(Boolean)

    // Half adder: XOR + AND
    if (types.includes('XOR') && types.includes('AND')) found.push('Half Adder pattern (XOR + AND)')
    // SR latch: NOR + NOR or NAND + NAND
    const norCount = types.filter((t) => t === 'NOR').length
    const nandCount = types.filter((t) => t === 'NAND').length
    if (norCount >= 2) found.push('SR Latch pattern (cross-coupled NOR gates)')
    if (nandCount >= 2) found.push('NAND Latch pattern (cross-coupled NAND gates)')
    // MUX: AND + OR + NOT
    if (types.includes('AND') && types.includes('OR') && types.includes('NOT') && types.length >= 3)
        found.push('Possible MUX structure (AND + OR + NOT)')
    // Prebuilt combos
    combos.forEach((c) => {
        const def = COMBO_DEFS[c as ComboType]
        if (def) found.push(`Prebuilt: ${def.name}`)
    })

    return found
}

// ─── Gate type name display ───────────────────────────────────────────────────
function gateDisplay(gateType: string): string {
    return `${gateType} Gate`
}

// ─── Generate analysis text ───────────────────────────────────────────────────
export function analyzeCircuit(nodes: Node[], edges: Edge[]): Analysis {
    const classified = nodes.map((n) => ({ node: n, cls: classifyNode(n) }))

    const inputs = classified.filter((c) => c.cls === 'input')
    const outputs = classified.filter((c) => c.cls === 'output')
    const clocks = classified.filter((c) => c.cls === 'clock')
    const gates = classified.filter((c) => c.cls === 'gate')
    const combos = classified.filter((c) => c.cls === 'combo')
    const seqs = classified.filter((c) => c.cls === 'seq')
    const mems = classified.filter((c) => c.cls === 'mem')
    const alus = classified.filter((c) => c.cls === 'alu')
    const cpus = classified.filter((c) => c.cls === 'cpu')

    // Gate frequency
    const gateFreq: Record<string, number> = {}
    gates.forEach((g) => {
        const t = String((g.node.data as Record<string, unknown>).gateType)
        gateFreq[t] = (gateFreq[t] ?? 0) + 1
    })

    // Current signal levels on outputs
    const outputStates = outputs.map((o) => {
        const inEdge = edges.find((e) => e.target === o.node.id)
        const srcNode = inEdge ? nodes.find((n) => n.id === inEdge.source) : undefined
        const outVal = srcNode ? ((srcNode.data as Record<string, unknown>).outputValue as number ?? 0) : 0
        return outVal
    })

    // Patterns
    const patterns = detectPatterns(nodes, edges)

    // Complexity
    const complexity = nodes.length < 5 ? 'simple' : nodes.length < 20 ? 'moderate' : 'complex'

    // Check for unconnected nodes
    const connectedNodeIds = new Set<string>()
    edges.forEach((e) => { connectedNodeIds.add(e.source); connectedNodeIds.add(e.target) })
    const unconnected = nodes.filter((n) => !connectedNodeIds.has(n.id) && classifyNode(n) !== 'input' && classifyNode(n) !== 'output')

    return {
        summary: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            inputCount: inputs.length,
            outputCount: outputs.length,
            clockCount: clocks.length,
            gateCount: gates.length,
            comboCount: combos.length,
            seqCount: seqs.length,
            memCount: mems.length,
            aluCount: alus.length,
            cpuCount: cpus.length,
            complexity,
        },
        gateFreq,
        patterns,
        outputStates,
        unconnectedCount: unconnected.length,
        components: {
            combos: combos.map((c) => {
                const d = COMBO_DEFS[(c.node.data as Record<string, unknown>).componentType as ComboType]
                return d?.name ?? String((c.node.data as Record<string, unknown>).componentType)
            }),
            seqs: seqs.map((s) => {
                const d = SEQ_DEFS[(s.node.data as Record<string, unknown>).seqType as SeqType]
                return d?.name ?? String((s.node.data as Record<string, unknown>).seqType)
            }),
            mems: mems.map((m) => {
                const d = MEM_DEFS[(m.node.data as Record<string, unknown>).memType as MemType]
                return d?.name ?? String((m.node.data as Record<string, unknown>).memType)
            }),
            alus: alus.map((a) => {
                const d = ALU_DEFS[(a.node.data as Record<string, unknown>).aluType as AluType]
                return d?.name ?? String((a.node.data as Record<string, unknown>).aluType)
            }),
        },
    }
}

// ─── Generate prose explanation ───────────────────────────────────────────────
export function generateExplanation(analysis: Analysis): string[] {
    const s = analysis.summary
    const paras: string[] = []

    if (s.nodeCount === 0) {
        paras.push('The canvas is empty. Drag components from the left panel to start building a circuit.')
        return paras
    }

    // Overview
    let overview = `This is a ${s.complexity} circuit with ${s.nodeCount} component${s.nodeCount > 1 ? 's' : ''} `
    overview += `connected by ${s.edgeCount} wire${s.edgeCount !== 1 ? 's' : ''}.`
    paras.push(overview)

    // Inputs/outputs
    if (s.inputCount > 0 || s.outputCount > 0) {
        const ioDesc = []
        if (s.inputCount > 0) ioDesc.push(`${s.inputCount} input switch${s.inputCount > 1 ? 'es' : ''}`)
        if (s.clockCount > 0) ioDesc.push(`${s.clockCount} clock${s.clockCount > 1 ? 's' : ''}`)
        if (s.outputCount > 0) ioDesc.push(`${s.outputCount} LED output${s.outputCount > 1 ? 's' : ''}`)
        paras.push('Interfaces: ' + ioDesc.join(', ') + '.')
    }

    // Logic gates
    if (s.gateCount > 0) {
        const gateList = Object.entries(analysis.gateFreq)
            .map(([g, c]) => `${c > 1 ? `${c}× ` : ''}${g}`)
            .join(', ')
        paras.push(`Logic gates: ${gateList}.`)
    }

    // Prebuilt components
    const allComponents = [
        ...analysis.components.combos.map((c) => `${c} (combinational)`),
        ...analysis.components.seqs.map((c) => `${c} (sequential)`),
        ...analysis.components.mems.map((c) => `${c} (memory)`),
        ...analysis.components.alus.map((c) => `${c} (ALU/Math)`),
        ...(s.cpuCount > 0 ? [`4-bit CPU × ${s.cpuCount}`] : []),
    ]
    if (allComponents.length > 0) {
        paras.push(`Prebuilt components: ${allComponents.join('; ')}.`)
    }

    // Detected patterns
    if (analysis.patterns.length > 0) {
        paras.push(`Detected pattern${analysis.patterns.length > 1 ? 's' : ''}: ${analysis.patterns.join(' | ')}.`)
    }

    // Output states
    if (analysis.outputStates.length > 0) {
        const highs = analysis.outputStates.filter((v) => v === 1).length
        paras.push(`Current output${analysis.outputStates.length > 1 ? 's' : ''}: ${highs} HIGH, ${analysis.outputStates.length - highs} LOW.`)
    }

    // Warnings
    if (analysis.unconnectedCount > 0) {
        paras.push(`⚠ ${analysis.unconnectedCount} component${analysis.unconnectedCount > 1 ? 's are' : ' is'} not connected to any wire.`)
    }
    if (s.inputCount === 0 && s.nodeCount > 0) {
        paras.push('⚠ No input switches — add Switch nodes and connect them to provide signal sources.')
    }
    if (s.outputCount === 0 && s.nodeCount > 0) {
        paras.push('⚠ No LED outputs — add Output nodes to observe results.')
    }

    return paras
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Analysis {
    summary: {
        nodeCount: number; edgeCount: number; inputCount: number; outputCount: number
        clockCount: number; gateCount: number; comboCount: number; seqCount: number
        memCount: number; aluCount: number; cpuCount: number
        complexity: 'simple' | 'moderate' | 'complex'
    }
    gateFreq: Record<string, number>
    patterns: string[]
    outputStates: number[]
    unconnectedCount: number
    components: { combos: string[]; seqs: string[]; mems: string[]; alus: string[] }
}
