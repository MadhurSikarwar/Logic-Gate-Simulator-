import type { Node, Edge } from '@xyflow/react'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ProjectMeta {
    created: string
    modified: string
    version: string
    description?: string
}

export interface ProjectFile {
    name: string
    version: string
    nodes: Node[]
    edges: Edge[]
    meta: ProjectMeta
}

export interface ParseResult {
    ok: boolean
    project?: ProjectFile
    error?: string
}

const CURRENT_VERSION = '1.0.0'
const LS_KEY = 'lgs-autosave'
const LS_PROJECT_NAME_KEY = 'lgs-projectname'

// ─── Serialize ────────────────────────────────────────────────────────────────
export function serializeProject(name: string, nodes: Node[], edges: Edge[]): ProjectFile {
    const now = new Date().toISOString()
    return {
        name: name || 'Untitled Circuit',
        version: CURRENT_VERSION,
        nodes: JSON.parse(JSON.stringify(nodes)) as Node[],
        edges: JSON.parse(JSON.stringify(edges)) as Edge[],
        meta: { created: now, modified: now, version: CURRENT_VERSION },
    }
}

// ─── Download as .lgs.json ────────────────────────────────────────────────────
export function downloadProject(name: string, nodes: Node[], edges: Edge[]): void {
    try {
        const project = serializeProject(name, nodes, edges)
        const json = JSON.stringify(project, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'circuit'}.lgs.json`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
    } catch (err) {
        console.error('[projectIO] downloadProject failed:', err)
        throw new Error('Failed to save project file. Please try again.')
    }
}

// ─── Validate + parse JSON text ───────────────────────────────────────────────
export function parseProjectFile(text: string): ParseResult {
    let raw: unknown
    try {
        raw = JSON.parse(text)
    } catch {
        return { ok: false, error: 'File is not valid JSON.' }
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { ok: false, error: 'Invalid project file: root must be a JSON object.' }
    }

    const obj = raw as Record<string, unknown>

    if (!obj.version || typeof obj.version !== 'string') {
        return { ok: false, error: 'Invalid project file: missing version field.' }
    }
    if (!Array.isArray(obj.nodes)) {
        return { ok: false, error: 'Invalid project file: nodes must be an array.' }
    }
    if (!Array.isArray(obj.edges)) {
        return { ok: false, error: 'Invalid project file: edges must be an array.' }
    }

    // Sanitize nodes — ensure each has id, type, position, data
    const nodes: Node[] = (obj.nodes as unknown[]).filter((n): n is Node => {
        if (!n || typeof n !== 'object') return false
        const node = n as Record<string, unknown>
        return typeof node.id === 'string' && typeof node.position === 'object'
    })

    // Sanitize edges — ensure each has id, source, target
    const edges: Edge[] = (obj.edges as unknown[]).filter((e): e is Edge => {
        if (!e || typeof e !== 'object') return false
        const edge = e as Record<string, unknown>
        return typeof edge.id === 'string' && typeof edge.source === 'string' && typeof edge.target === 'string'
    })

    const project: ProjectFile = {
        name: typeof obj.name === 'string' ? obj.name : 'Imported Circuit',
        version: obj.version,
        nodes,
        edges,
        meta: obj.meta as ProjectMeta ?? { created: new Date().toISOString(), modified: new Date().toISOString(), version: obj.version },
    }

    return { ok: true, project }
}

// ─── Open file dialog → parse ─────────────────────────────────────────────────
export function openProjectFile(): Promise<ParseResult> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,.lgs.json'
        input.onchange = () => {
            const file = input.files?.[0]
            if (!file) { resolve({ ok: false, error: 'No file selected.' }); return }
            const reader = new FileReader()
            reader.onload = (ev) => {
                try {
                    const text = ev.target?.result
                    if (typeof text !== 'string') { resolve({ ok: false, error: 'Could not read file.' }); return }
                    resolve(parseProjectFile(text))
                } catch (err) {
                    console.error('[projectIO] onload error:', err)
                    resolve({ ok: false, error: 'Unexpected error reading file.' })
                }
            }
            reader.onerror = () => resolve({ ok: false, error: 'File read error.' })
            reader.readAsText(file)
        }
        // User cancelled
        window.addEventListener('focus', () => setTimeout(() => { if (!input.files?.length) resolve({ ok: false }) }, 300), { once: true })
        input.click()
    })
}

// ─── Auto-save to localStorage ────────────────────────────────────────────────
export function autoSave(name: string, nodes: Node[], edges: Edge[]): void {
    try {
        const project = serializeProject(name, nodes, edges)
        localStorage.setItem(LS_KEY, JSON.stringify(project))
        localStorage.setItem(LS_PROJECT_NAME_KEY, name)
    } catch (err: unknown) {
        // DOMException: QuotaExceededError — silently ignore
        if (err instanceof DOMException && err.name === 'QuotaExceededError') return
        console.warn('[projectIO] autoSave failed:', err)
    }
}

// ─── Auto-load from localStorage ─────────────────────────────────────────────
export function autoLoad(): ParseResult {
    try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return { ok: false }
        return parseProjectFile(raw)
    } catch (err) {
        console.warn('[projectIO] autoLoad failed:', err)
        return { ok: false, error: 'Auto-save data is corrupted.' }
    }
}

export function clearAutoSave(): void {
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

export function hasAutoSave(): boolean {
    try { return !!localStorage.getItem(LS_KEY) } catch { return false }
}

// ─── Built-in example circuits ────────────────────────────────────────────────
export const EXAMPLE_CIRCUITS: { name: string; description: string; nodes: Node[]; edges: Edge[] }[] = [
    {
        name: 'AND Gate Demo',
        description: 'Two switches wired into an AND gate with an LED output. Toggle the switches to see real-time output.',
        nodes: [
            { id: 'ex-in1', type: 'inputNode', position: { x: 80, y: 120 }, data: { gateType: 'INPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
            { id: 'ex-in2', type: 'inputNode', position: { x: 80, y: 230 }, data: { gateType: 'INPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
            { id: 'ex-g1', type: 'gateNode', position: { x: 290, y: 170 }, data: { gateType: 'AND', numInputs: 2, inputValues: [0, 0], outputValue: 0 } },
            { id: 'ex-out', type: 'outputNode', position: { x: 490, y: 170 }, data: { gateType: 'OUTPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
        ] as Node[],
        edges: [
            { id: 'ex-e1', source: 'ex-in1', target: 'ex-g1', sourceHandle: 'output-0', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
            { id: 'ex-e2', source: 'ex-in2', target: 'ex-g1', sourceHandle: 'output-0', targetHandle: 'input-1', type: 'signalEdge', data: { signal: 0 } },
            { id: 'ex-e3', source: 'ex-g1', target: 'ex-out', sourceHandle: 'output-0', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
        ] as Edge[],
    },
    {
        name: 'Half Adder',
        description: 'A and B inputs → Sum (XOR) and Carry (AND) outputs. The foundation of binary addition.',
        nodes: [
            { id: 'ha-in1', type: 'inputNode', position: { x: 80, y: 100 }, data: { gateType: 'INPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
            { id: 'ha-in2', type: 'inputNode', position: { x: 80, y: 240 }, data: { gateType: 'INPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
            { id: 'ha-xor', type: 'gateNode', position: { x: 300, y: 100 }, data: { gateType: 'XOR', numInputs: 2, inputValues: [0, 0], outputValue: 0 } },
            { id: 'ha-and', type: 'gateNode', position: { x: 300, y: 240 }, data: { gateType: 'AND', numInputs: 2, inputValues: [0, 0], outputValue: 0 } },
            { id: 'ha-sum', type: 'outputNode', position: { x: 500, y: 100 }, data: { gateType: 'OUTPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
            { id: 'ha-cry', type: 'outputNode', position: { x: 500, y: 240 }, data: { gateType: 'OUTPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
        ] as Node[],
        edges: [
            { id: 'ha-e1', source: 'ha-in1', target: 'ha-xor', sourceHandle: 'output-0', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
            { id: 'ha-e2', source: 'ha-in2', target: 'ha-xor', sourceHandle: 'output-0', targetHandle: 'input-1', type: 'signalEdge', data: { signal: 0 } },
            { id: 'ha-e3', source: 'ha-in1', target: 'ha-and', sourceHandle: 'output-0', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
            { id: 'ha-e4', source: 'ha-in2', target: 'ha-and', sourceHandle: 'output-0', targetHandle: 'input-1', type: 'signalEdge', data: { signal: 0 } },
            { id: 'ha-e5', source: 'ha-xor', target: 'ha-sum', sourceHandle: 'output-0', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
            { id: 'ha-e6', source: 'ha-and', target: 'ha-cry', sourceHandle: 'output-0', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
        ] as Edge[],
    },
    {
        name: 'D Flip-Flop',
        description: 'Rising-edge triggered D flip-flop. Q follows D on each clock rising edge. Connect the Clock node.',
        nodes: [
            { id: 'df-clk', type: 'gateNode', position: { x: 60, y: 80 }, data: { gateType: 'CLOCK', numInputs: 0, inputValues: [], outputValue: 0 } },
            { id: 'df-d', type: 'inputNode', position: { x: 60, y: 220 }, data: { gateType: 'INPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
            {
                id: 'df-dff', type: 'seqNode', position: { x: 280, y: 140 }, data: {
                    seqType: 'DFF',
                    inputValues: [0, 0, 0],
                    outputValues: [0, 0],
                    seqState: { Q: [0], prevClk: 0 },
                }
            },
            { id: 'df-q', type: 'outputNode', position: { x: 500, y: 140 }, data: { gateType: 'OUTPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
            { id: 'df-qb', type: 'outputNode', position: { x: 500, y: 220 }, data: { gateType: 'OUTPUT', numInputs: 1, inputValues: [0], outputValue: 0 } },
        ] as Node[],
        edges: [
            { id: 'df-e1', source: 'df-clk', target: 'df-dff', sourceHandle: 'output-0', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
            { id: 'df-e2', source: 'df-d', target: 'df-dff', sourceHandle: 'output-0', targetHandle: 'input-1', type: 'signalEdge', data: { signal: 0 } },
            { id: 'df-e3', source: 'df-dff', target: 'df-q', sourceHandle: 'output-0', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
            { id: 'df-e4', source: 'df-dff', target: 'df-qb', sourceHandle: 'output-1', targetHandle: 'input-0', type: 'signalEdge', data: { signal: 0 } },
        ] as Edge[],
    },
]
