import { useMemo } from 'react'
import {
    GitBranch,
    Zap,
    Layers,
    Timer,
    X,
    TrendingUp,
    AlertTriangle,
    Activity,
} from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'

const GATE_DELAYS: Record<string, number> = {
    NOT: 1,
    AND: 2, OR: 2, NAND: 2, NOR: 2,
    XOR: 3, XNOR: 3,
    INPUT: 0, OUTPUT: 0, CLOCK: 0,
}

export function CircuitStats() {
    const { nodes, edges, delayMode, gateDelay, toggleStats } = useCircuitStore()

    const stats = useMemo(() => {
        const gateNodes = nodes.filter((n) => !['INPUT', 'OUTPUT', 'CLOCK'].includes(
            (n.data as { gateType?: string })?.gateType ?? ''
        ))
        const inputNodes = nodes.filter((n) =>
            (n.data as { gateType?: string })?.gateType === 'INPUT'
        )
        const outputNodes = nodes.filter((n) =>
            (n.data as { gateType?: string })?.gateType === 'OUTPUT'
        )

        // Circuit depth via BFS/topological levels
        const inDegree = new Map<string, number>()
        const outgoing = new Map<string, string[]>()
        for (const n of nodes) { inDegree.set(n.id, 0); outgoing.set(n.id, []) }
        for (const e of edges) {
            inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
            outgoing.get(e.source)?.push(e.target)
        }
        let queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)
        let depth = 0
        while (queue.length) {
            depth++
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

        // Estimated delay along critical path
        const nodeLevels = new Map<string, number>()
        const levelNodes = (() => {
            const ind2 = new Map<string, number>()
            const out2 = new Map<string, string[]>()
            for (const n of nodes) { ind2.set(n.id, 0); out2.set(n.id, []) }
            for (const e of edges) {
                ind2.set(e.target, (ind2.get(e.target) ?? 0) + 1)
                out2.get(e.source)?.push(e.target)
            }
            let q2 = nodes.filter((n) => (ind2.get(n.id) ?? 0) === 0).map((n) => n.id)
            let lvl = 0
            while (q2.length) {
                q2.forEach((id) => nodeLevels.set(id, lvl))
                const nxt: string[] = []
                q2.forEach((id) => {
                    for (const nb of out2.get(id) ?? []) {
                        const d = (ind2.get(nb) ?? 0) - 1
                        ind2.set(nb, d)
                        if (d === 0) nxt.push(nb)
                    }
                })
                q2 = nxt; lvl++
            }
        })()

        // Critical path delay (sum of gate delays along longest path)
        const pathDelay = new Map<string, number>()
        const topoOrder = [...nodes].sort(
            (a, b) => (nodeLevels.get(a.id) ?? 0) - (nodeLevels.get(b.id) ?? 0)
        )
        for (const n of topoOrder) {
            const gType = (n.data as { gateType?: string })?.gateType ?? ''
            const ownDelay = GATE_DELAYS[gType] ?? 1
            const maxIncoming = Math.max(0, ...edges
                .filter((e) => e.target === n.id)
                .map((e) => pathDelay.get(e.source) ?? 0))
            pathDelay.set(n.id, maxIncoming + ownDelay)
        }
        const criticalDelay = Math.max(0, ...Array.from(pathDelay.values()))

        // Signal stats
        const highEdges = edges.filter(
            (e) => (e.data as { signal?: number })?.signal === 1
        ).length

        return {
            gateCount: gateNodes.length,
            inputCount: inputNodes.length,
            outputCount: outputNodes.length,
            wireCount: edges.length,
            depth: Math.max(0, depth - 1),
            criticalDelay,
            highEdges,
            totalNodes: nodes.length,
        }
    }, [nodes, edges])

    const rows = [
        { label: 'Gates', value: stats.gateCount, cls: 'accent' },
        { label: 'Inputs', value: stats.inputCount, cls: '' },
        { label: 'Outputs', value: stats.outputCount, cls: '' },
        { label: 'Wires (Edges)', value: stats.wireCount, cls: '' },
        { label: 'Wires HIGH', value: stats.highEdges, cls: stats.highEdges > 0 ? 'high' : '' },
        { label: 'Circuit Depth', value: `${stats.depth} levels`, cls: 'accent' },
        { label: 'Critical Path Delay', value: `${stats.criticalDelay} gate-delays`, cls: '' },
        {
            label: 'Est. Propagation',
            value: delayMode ? `${stats.criticalDelay * gateDelay} ms` : 'Instant',
            cls: delayMode ? 'accent' : '',
        },
    ]

    return (
        <div className="stats-panel">
            {/* Header */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Activity size={14} color="var(--accent)" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
                        Circuit Statistics
                    </span>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleStats}>
                    <X size={13} />
                </button>
            </div>

            {/* Stats rows */}
            {rows.map((r) => (
                <div key={r.label} className="stats-row">
                    <span className="stats-label">{r.label}</span>
                    <span className={`stats-value ${r.cls}`}>{r.value}</span>
                </div>
            ))}

            {/* Empty circuit message */}
            {stats.totalNodes === 0 && (
                <div style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12, textAlign: 'center' }}>
                    Add gates to see statistics
                </div>
            )}
        </div>
    )
}
