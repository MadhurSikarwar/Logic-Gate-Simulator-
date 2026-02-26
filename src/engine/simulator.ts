import type { Node, Edge } from '@xyflow/react'
import { evaluateGate, type GateType } from './gateLogic'
import { evaluateCombo, type ComboType } from './combinationalLogic'
import { evaluateSeq, type SeqType, type SeqState } from './sequentialLogic'
import { evaluateMemory, type MemType, type MemState } from './memoryLogic'
import { evaluateAlu, type AluType } from './aluLogic'
import { evaluateCpu, type CpuState, makeCpuState } from './cpuLogic'

// Inline data shape so simulator has no circular dependency on gate components
interface GateNodeData {
    gateType: string
    numInputs: number
    inputValues: (0 | 1)[]
    outputValue: 0 | 1
    [key: string]: unknown
}


// ─── Types ────────────────────────────────────────────────────────────────────
interface SimResult {
    nodes: Node[]
    edgeSignals: Map<string, 0 | 1>  // edgeId -> signal value
}

// ─── Topological Sort (Kahn's Algorithm) ─────────────────────────────────────
function topoSort(nodes: Node[], edges: Edge[]): string[] {
    const inDegree = new Map<string, number>()
    const outgoing = new Map<string, string[]>()

    for (const n of nodes) {
        inDegree.set(n.id, 0)
        outgoing.set(n.id, [])
    }
    for (const e of edges) {
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
        outgoing.get(e.source)?.push(e.target)
    }

    const queue = [...nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)]
    const order: string[] = []

    while (queue.length) {
        const id = queue.shift()!
        order.push(id)
        for (const next of outgoing.get(id) ?? []) {
            const deg = (inDegree.get(next) ?? 0) - 1
            inDegree.set(next, deg)
            if (deg === 0) queue.push(next)
        }
    }

    return order
}

// ─── Main Simulation ──────────────────────────────────────────────────────────
export function runSimulation(nodes: Node[], edges: Edge[]): SimResult {
    // Deep-copy node data so we don't mutate originals
    const nodeMap = new Map<string, Node>(
        nodes.map((n) => [n.id, { ...n, data: { ...(n.data as object) } }])
    )

    // Build incoming edge map: targetNodeId -> Edge[]
    const incoming = new Map<string, Edge[]>()
    for (const e of edges) {
        const list = incoming.get(e.target) ?? []
        list.push(e)
        incoming.set(e.target, list)
    }

    // Process nodes in topological order
    const order = topoSort(nodes, edges)

    for (const nodeId of order) {
        const node = nodeMap.get(nodeId)
        if (!node) continue

        const data = node.data as Record<string, unknown>
        const gateType = data?.gateType as string | undefined
        const componentType = data?.componentType as string | undefined

        // INPUT / CLOCK nodes keep their own value
        if (gateType === 'INPUT' || gateType === 'CLOCK') continue
        // Must be a gate or combo node
        if (!gateType && !componentType) continue

        // Collect input values from incoming edges
        const newInputValues: (0 | 1)[] = [...((data.inputValues ?? []) as (0 | 1)[])]

        for (const edge of incoming.get(nodeId) ?? []) {
            const sourceNode = nodeMap.get(edge.source)
            if (!sourceNode) continue
            const srcData = sourceNode.data as Record<string, unknown>

            // Resolve source signal (single or multi-output)
            let sourceVal: 0 | 1 = 0
            if (srcData.outputValues) {
                // Multi-output combo node: pick from sourceHandle
                const outIdx = parseInt((edge.sourceHandle ?? '0').replace('output-', ''), 10)
                sourceVal = ((srcData.outputValues as (0 | 1)[])[isNaN(outIdx) ? 0 : outIdx]) ?? 0
            } else {
                sourceVal = (srcData.outputValue as 0 | 1) ?? 0
            }

            // Route to target input slot
            const handle = edge.targetHandle ?? ''
            const idx = parseInt(handle.replace('input-', ''), 10)
            if (!isNaN(idx)) newInputValues[idx] = sourceVal
        }

        // Evaluate: gate | combo | sequential
        if (componentType) {
            const outVals = evaluateCombo(componentType as ComboType, newInputValues as (0 | 1)[])
            nodeMap.set(nodeId, {
                ...node,
                data: { ...data, inputValues: newInputValues, outputValues: outVals },
            })
        } else if (data.seqType) {
            // Sequential node: stateful evaluation with edge detection
            const seqState = (data.seqState as SeqState) ?? { Q: [0], prevClk: 0 }
            const result = evaluateSeq(data.seqType as SeqType, newInputValues as (0 | 1)[], seqState)
            nodeMap.set(nodeId, {
                ...node,
                data: { ...data, inputValues: newInputValues, outputValues: result.outputs, seqState: result.state },
            })
        } else if (data.memType) {
            // Memory node: stateful evaluation (ROM read / RAM write)
            const memState = (data.memState as MemState) ?? { data: [], sp: 0, rp: 0, wp: 0, count: 0, prevClk: 0 as 0 | 1 }
            const result = evaluateMemory(data.memType as MemType, newInputValues as (0 | 1)[], memState)
            nodeMap.set(nodeId, {
                ...node,
                data: { ...data, inputValues: newInputValues, outputValues: result.outputs, memState: result.state },
            })
        } else if (data.aluType) {
            // ALU node: pure combinational, no state
            const outVals = evaluateAlu(data.aluType as AluType, newInputValues as (0 | 1)[])
            nodeMap.set(nodeId, {
                ...node,
                data: { ...data, inputValues: newInputValues, outputValues: outVals },
            })
        } else if (data.cpuType != null || node.type === 'cpuNode') {
            // CPU node: clock-driven micro-architecture
            const cpuState = (data.cpuState as CpuState) ?? makeCpuState()
            const result = evaluateCpu(newInputValues as (0 | 1)[], cpuState)
            nodeMap.set(nodeId, {
                ...node,
                data: { ...data, inputValues: newInputValues, outputValues: result.outputs, cpuState: result.state },
            })
        } else if (gateType) {
            const newOutput = evaluateGate(gateType as GateType, newInputValues)
            nodeMap.set(nodeId, {
                ...node,
                data: { ...data, inputValues: newInputValues, outputValue: newOutput },
            })
        }
    }

    // Compute per-edge signal: pick from correct output handle
    const edgeSignals = new Map<string, 0 | 1>()
    for (const e of edges) {
        const src = nodeMap.get(e.source)
        const sd = src?.data as Record<string, unknown> | undefined
        let val: 0 | 1 = 0
        if (sd?.outputValues) {
            const outIdx = parseInt((e.sourceHandle ?? '0').replace('output-', ''), 10)
            val = ((sd.outputValues as (0 | 1)[])[isNaN(outIdx) ? 0 : outIdx]) ?? 0
        } else {
            val = (sd?.outputValue as 0 | 1) ?? 0
        }
        edgeSignals.set(e.id, val)
    }

    return { nodes: Array.from(nodeMap.values()), edgeSignals }
}

// ─── Edge Style Helpers ────────────────────────────────────────────────
export const SIGNAL_HIGH_STYLE = {
    stroke: '#00ff9d',
    strokeWidth: 2.5,
    filter: 'drop-shadow(0 0 5px #00ff9d88)',
} as const

export const SIGNAL_LOW_STYLE_DARK = {
    stroke: '#2d4060',
    strokeWidth: 2,
    filter: 'none',
} as const

export const SIGNAL_LOW_STYLE_LIGHT = {
    stroke: '#94a3b8',
    strokeWidth: 2,
    filter: 'none',
} as const

export function edgeStyleForSignal(signal: 0 | 1, theme: string) {
    return signal === 1
        ? SIGNAL_HIGH_STYLE
        : theme === 'light'
            ? SIGNAL_LOW_STYLE_LIGHT
            : SIGNAL_LOW_STYLE_DARK
}

// ─── Topological Level Helpers ─────────────────────────────────────────
/**
 * Groups node IDs by their topological level (BFS layer).
 * Level 0 = nodes with no incoming edges (source nodes).
 */
export function getTopologicalLevels(nodes: Node[], edges: Edge[]): string[][] {
    const inDegree = new Map<string, number>()
    const outgoing = new Map<string, string[]>()

    for (const n of nodes) { inDegree.set(n.id, 0); outgoing.set(n.id, []) }
    for (const e of edges) {
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
        outgoing.get(e.source)?.push(e.target)
    }

    let queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)
    const levels: string[][] = []

    while (queue.length) {
        levels.push([...queue])
        const next: string[] = []
        for (const id of queue) {
            for (const nb of outgoing.get(id) ?? []) {
                const d = (inDegree.get(nb) ?? 0) - 1
                inDegree.set(nb, d)
                if (d === 0) next.push(nb)
            }
        }
        queue = next
    }

    return levels
}

/**
 * Returns a map from edgeId → the topological level of its source node.
 * Used for staged delay animation.
 */
export function getEdgeLevelMap(nodes: Node[], edges: Edge[]): Map<string, number> {
    const levels = getTopologicalLevels(nodes, edges)
    const nodeLevels = new Map<string, number>()
    levels.forEach((lvlNodes, idx) => lvlNodes.forEach((id) => nodeLevels.set(id, idx)))

    const edgeLevels = new Map<string, number>()
    for (const e of edges) {
        edgeLevels.set(e.id, nodeLevels.get(e.source) ?? 0)
    }
    return edgeLevels
}
