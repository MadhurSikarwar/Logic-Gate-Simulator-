import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { downloadVerilog } from '../utils/verilogExport'
import { copyShareUrl, loadFromUrlHash, clearUrlHash } from '../utils/shareUrl'
import { exportCircuitAsPng } from '../utils/exportImage'
import { applyNodeChanges, applyEdgeChanges, type Node, type Edge, type NodeChange, type EdgeChange } from '@xyflow/react'
import { runSimulation, getEdgeLevelMap } from '../engine/simulator'
import type { GateNodeData } from '../components/gates/GateNode'
import type { GateType } from '../engine/gateLogic'
import { GATE_DEFS } from '../engine/gateLogic'
import type { ComboType } from '../engine/combinationalLogic'
import { COMBO_DEFS } from '../engine/combinationalLogic'
import type { SeqType } from '../engine/sequentialLogic'
import { SEQ_DEFS } from '../engine/sequentialLogic'
import type { MemType } from '../engine/memoryLogic'
import { MEM_DEFS } from '../engine/memoryLogic'
import type { AluType } from '../engine/aluLogic'
import { ALU_DEFS } from '../engine/aluLogic'
import { makeCpuState, cpuStep, DEFAULT_SOURCE } from '../engine/cpuLogic'
import type { CpuState } from '../engine/cpuLogic'
import { downloadProject, openProjectFile, autoSave, EXAMPLE_CIRCUITS } from '../utils/projectIO'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Theme = 'dark' | 'light' | 'cyberpunk' | 'blueprint' | 'pcb'
export type EditorMode = 'select' | 'connect' | 'pan'

interface Snapshot { nodes: Node[]; edges: Edge[] }
const MAX_TIMING = 64
const MAX_HISTORY = 60
let nodeCounter = 0

// ─── Auto-save ────────────────────────────────────────────────────────────────
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleAutoSave(name: string, nodes: Node[], edges: Edge[]) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
        try { autoSave(name, nodes, edges) } catch { /* silent */ }
    }, 2000)
}

// ─── Interface ────────────────────────────────────────────────────────────────
interface CircuitStore {
    nodes: Node[]
    edges: Edge[]
    theme: Theme
    mode: EditorMode
    selectedNodeId: string | null
    internalViewId: string | null
    memViewerId: string | null
    cpuPanelId: string | null
    showExplainer: boolean
    leftPanelOpen: boolean
    rightPanelOpen: boolean
    shortcutsOpen: boolean
    showStats: boolean
    showTiming: boolean
    showWelcome: boolean
    toastMessage: string | null
    zoom: number
    cursorX: number
    cursorY: number
    past: Snapshot[]
    future: Snapshot[]
    projectName: string
    isDirty: boolean
    delayMode: boolean
    gateDelay: number
    isSimulating: boolean
    clockRunning: boolean
    clockFreq: number
    timingData: Map<string, (0 | 1)[]>
    timingTick: number

    // Actions
    onNodesChange: (changes: NodeChange[]) => void
    onEdgesChange: (changes: EdgeChange[]) => void
    connectEdge: (edge: Edge) => void
    setTheme: (t: Theme) => void
    toggleTheme: () => void
    setMode: (m: EditorMode) => void
    setSelectedNodeId: (id: string | null) => void
    setInternalViewId: (id: string | null) => void
    setMemViewerId: (id: string | null) => void
    setCpuPanelId: (id: string | null) => void
    setShowExplainer: (show: boolean) => void
    shareProject: () => Promise<void>
    exportVerilog: () => void
    exportPng: () => Promise<void>
    setShowWelcome: (show: boolean) => void
    showToast: (msg: string) => void
    toggleLeftPanel: () => void
    toggleRightPanel: () => void
    toggleShortcuts: () => void
    toggleStats: () => void
    toggleTiming: () => void
    setZoom: (z: number) => void
    setCursor: (x: number, y: number) => void
    setProjectName: (n: string) => void
    toggleDelayMode: () => void
    setGateDelay: (ms: number) => void
    toggleInput: (nodeId: string, inputIdx: number) => void

    // Node creators
    addGateNode: (type: GateType, position: { x: number; y: number }) => string
    addComboNode: (type: ComboType, position: { x: number; y: number }) => string
    addSeqNode: (type: SeqType, position: { x: number; y: number }) => string
    addMemoryNode: (type: MemType, position: { x: number; y: number }) => string
    writeRomByte: (nodeId: string, addr: number, value: number) => void
    addAluNode: (type: AluType, position: { x: number; y: number }) => string
    addCpuNode: (position: { x: number; y: number }) => string
    updateCpuProgram: (nodeId: string, program: number[]) => void
    stepCpuManual: (nodeId: string) => void
    resetCpuNode: (nodeId: string) => void

    // Project I/O
    saveProject: () => void
    openProject: () => Promise<void>
    loadExampleCircuit: (idx: number) => void
    loadProjectFromJSON: (nodes: Node[], edges: Edge[], name?: string) => void

    // Clock
    startClock: () => void
    stopClock: () => void
    toggleClock: () => void
    setClockFreq: (hz: number) => void
    clockTick: () => void

    // History
    saveHistory: () => void
    undo: () => void
    redo: () => void
    canUndo: () => boolean
    canRedo: () => boolean
    clearCircuit: () => void
    newProject: () => void
    _simulate: () => void
    _simulateWithDelay: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeGateNode(type: GateType, position: { x: number; y: number }): Node {
    const def = GATE_DEFS[type]
    const n = def?.defaultInputs ?? 2
    nodeCounter += 1
    const typeMap: Record<string, string> = { INPUT: 'inputNode', OUTPUT: 'outputNode' }
    return {
        id: `${type.toLowerCase()}-${nodeCounter}`, type: typeMap[type] ?? 'gateNode', position,
        data: { gateType: type, numInputs: n, inputValues: Array(n).fill(0), outputValue: 0 } as GateNodeData as Record<string, unknown>,
    }
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useCircuitStore = create<CircuitStore>()(
    subscribeWithSelector((set, get) => ({
        nodes: [], edges: [],
        theme: 'dark', mode: 'select',
        selectedNodeId: null, internalViewId: null, memViewerId: null, cpuPanelId: null, showExplainer: false,
        leftPanelOpen: true, rightPanelOpen: true, shortcutsOpen: false,
        showStats: false, showTiming: false,
        showWelcome: !localStorage.getItem('lgs-onboarded'),
        toastMessage: null,
        zoom: 1, cursorX: 0, cursorY: 0,
        past: [], future: [],
        projectName: 'Untitled Circuit', isDirty: false,
        delayMode: false, gateDelay: 150, isSimulating: false,
        clockRunning: false, clockFreq: 2,
        timingData: new Map(), timingTick: 0,

        onNodesChange: (changes) => {
            set((s) => { const nodes = applyNodeChanges(changes, s.nodes); scheduleAutoSave(s.projectName, nodes, s.edges); return { nodes, isDirty: true } })
            get()._simulate()
        },
        onEdgesChange: (changes) => {
            set((s) => { const edges = applyEdgeChanges(changes, s.edges); scheduleAutoSave(s.projectName, s.nodes, edges); return { edges, isDirty: true } })
            get()._simulate()
        },

        connectEdge: (edge) => {
            get().saveHistory()
            set((s) => ({ edges: [...s.edges, { ...edge, type: 'signalEdge', data: { signal: 0 } }], isDirty: true }))
            get()._simulate()
        },

        setTheme: (theme) => {
            set({ theme })
            const el = document.documentElement
            el.classList.remove('dark', 'light', 'cyberpunk', 'blueprint', 'pcb')
            el.classList.add(theme)
            localStorage.setItem('lgs-theme', theme)
        },
        toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
        setMode: (mode) => set({ mode }),
        setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
        setInternalViewId: (internalViewId) => set({ internalViewId }),
        setMemViewerId: (memViewerId) => set({ memViewerId }),
        setCpuPanelId: (cpuPanelId) => set({ cpuPanelId }),
        setShowExplainer: (showExplainer) => set({ showExplainer }),
        shareProject: async () => {
            const { nodes, edges, showToast } = get()
            try { const { url } = await copyShareUrl(nodes, edges); showToast(`🔗 Share URL copied (${url.length} chars)`) }
            catch (err: unknown) { showToast(`❌ ${err instanceof Error ? err.message : 'Share failed'}`) }
        },
        exportVerilog: () => {
            const { nodes, edges, projectName, showToast } = get()
            try { downloadVerilog(nodes, edges, projectName); showToast(`📄 Exported ${projectName}.v`) }
            catch (err: unknown) { showToast(`❌ ${err instanceof Error ? err.message : 'Verilog export failed'}`) }
        },
        exportPng: async () => {
            const { nodes, edges, projectName, showToast } = get()
            try { await exportCircuitAsPng(nodes, edges, projectName); showToast(`🖼 Exported ${projectName}.png`) }
            catch (err: unknown) { showToast(`❌ ${err instanceof Error ? err.message : 'PNG export failed'}`) }
        },
        setShowWelcome: (showWelcome) => {
            if (!showWelcome) { try { localStorage.setItem('lgs-onboarded', '1') } catch { /* ignore */ } }
            set({ showWelcome })
        },
        showToast: (msg) => {
            set({ toastMessage: msg })
            setTimeout(() => set({ toastMessage: null }), 2800)
        },
        toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
        toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
        toggleShortcuts: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
        toggleStats: () => set((s) => ({ showStats: !s.showStats })),
        toggleTiming: () => set((s) => ({ showTiming: !s.showTiming })),
        setZoom: (zoom) => set({ zoom }),
        setCursor: (cursorX, cursorY) => set({ cursorX, cursorY }),
        setProjectName: (projectName) => set({ projectName, isDirty: true }),
        toggleDelayMode: () => { set((s) => ({ delayMode: !s.delayMode })); get()._simulate() },
        setGateDelay: (gateDelay) => set({ gateDelay }),

        // ─── Project I/O ─────────────────────────────────────────────────────────
        saveProject: () => {
            const { nodes, edges, projectName, showToast } = get()
            try {
                downloadProject(projectName, nodes, edges)
                set({ isDirty: false })
                showToast(`✅ Saved "${projectName}"`)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Save failed'
                showToast(`❌ ${msg}`)
            }
        },

        openProject: async () => {
            const { showToast } = get()
            try {
                const result = await openProjectFile()
                if (!result.ok) {
                    if (result.error) showToast(`❌ ${result.error}`)
                    return
                }
                const { project } = result
                if (!project) return
                get().saveHistory()
                set({ nodes: project.nodes, edges: project.edges, projectName: project.name, isDirty: false, timingData: new Map(), clockRunning: false })
                get()._simulate()
                showToast(`📂 Loaded "${project.name}"`)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Open failed'
                showToast(`❌ ${msg}`)
            }
        },

        loadExampleCircuit: (idx) => {
            const example = EXAMPLE_CIRCUITS[idx]
            if (!example) return
            get().saveHistory()
            set({ nodes: example.nodes, edges: example.edges, projectName: example.name, isDirty: false, timingData: new Map(), clockRunning: false })
            get()._simulate()
        },

        loadProjectFromJSON: (nodes, edges, name) => {
            get().saveHistory()
            set({ nodes, edges, projectName: name ?? 'Imported Circuit', isDirty: false, timingData: new Map(), clockRunning: false })
            get()._simulate()
        },

        // ─── Clock ───────────────────────────────────────────────────────────────
        startClock: () => set({ clockRunning: true }),
        stopClock: () => set({ clockRunning: false }),
        toggleClock: () => set((s) => ({ clockRunning: !s.clockRunning })),
        setClockFreq: (clockFreq) => set({ clockFreq }),

        clockTick: () => {
            const { nodes, _simulate } = get()
            const updated = nodes.map((n) => {
                const d = n.data as Record<string, unknown>
                if (d?.gateType !== 'CLOCK') return n
                const newVal: 0 | 1 = (d.outputValue as 0 | 1) === 0 ? 1 : 0
                return { ...n, data: { ...d, outputValue: newVal } }
            })
            set({ nodes: updated })
            _simulate()

            const simNodes = get().nodes
            const newTimingData = new Map(get().timingData)
            const tick = get().timingTick + 1
            for (const n of simNodes) {
                const d = n.data as Record<string, unknown>
                const isClk = d?.gateType === 'CLOCK'
                const isSeq = n.type === 'seqNode'
                if (!isClk && !isSeq) continue
                const history = [...(newTimingData.get(n.id) ?? [])].slice(-(MAX_TIMING - 1))
                if (isClk) history.push((d.outputValue as 0 | 1) ?? 0)
                else if (isSeq) { const Q = (d.seqState as { Q: (0 | 1)[] } | undefined)?.Q; history.push(Q?.[0] ?? 0) }
                newTimingData.set(n.id, history)
            }
            set({ timingData: newTimingData, timingTick: tick })
        },

        // ─── Input toggle ──────────────────────────────────────────────────────────
        toggleInput: (nodeId, inputIdx) => {
            const { nodes, edges, _simulate } = get()
            const isConnected = edges.some((e) => e.target === nodeId && e.targetHandle === `input-${inputIdx}`)
            if (isConnected) return
            const updatedNodes = nodes.map((n) => {
                if (n.id !== nodeId) return n
                const data = n.data as Record<string, unknown>
                if ((data.gateType as string) === 'INPUT' || inputIdx === -1)
                    return { ...n, data: { ...data, outputValue: data.outputValue === 0 ? 1 : 0 } }
                const newInputs = [...((data.inputValues ?? []) as (0 | 1)[])]
                newInputs[inputIdx] = newInputs[inputIdx] === 0 ? 1 : 0
                return { ...n, data: { ...data, inputValues: newInputs } }
            })
            set({ nodes: updatedNodes, isDirty: true })
            _simulate()
        },

        // ─── Node creators ────────────────────────────────────────────────────────
        addGateNode: (type, position) => {
            get().saveHistory(); const node = makeGateNode(type, position)
            set((s) => ({ nodes: [...s.nodes, node], isDirty: true })); get()._simulate(); return node.id
        },
        addComboNode: (type, position) => {
            get().saveHistory(); const def = COMBO_DEFS[type]; nodeCounter += 1
            const node: Node = { id: `${type.toLowerCase()}-${nodeCounter}`, type: 'comboNode', position, data: { componentType: type, inputValues: Array(def?.inputs.length ?? 2).fill(0), outputValues: Array(def?.outputs.length ?? 1).fill(0) } }
            set((s) => ({ nodes: [...s.nodes, node], isDirty: true })); get()._simulate(); return node.id
        },
        addSeqNode: (type, position) => {
            get().saveHistory(); const def = SEQ_DEFS[type]; nodeCounter += 1
            const node: Node = { id: `${type.toLowerCase()}-${nodeCounter}`, type: 'seqNode', position, data: { seqType: type, inputValues: Array(def?.inputs.length ?? 2).fill(0), outputValues: Array(def?.outputs.length ?? 1).fill(0), seqState: { ...def?.initState, Q: [...(def?.initState.Q ?? [0])] } } }
            set((s) => ({ nodes: [...s.nodes, node], isDirty: true })); get()._simulate(); return node.id
        },
        addMemoryNode: (type, position) => {
            get().saveHistory(); const def = MEM_DEFS[type]; nodeCounter += 1
            const node: Node = { id: `${type.toLowerCase()}-${nodeCounter}`, type: 'memoryNode', position, data: { memType: type, inputValues: Array(def?.inputs.length ?? 2).fill(0), outputValues: Array(def?.outputs.length ?? 1).fill(0), memState: { ...def?.initState, data: [...(def?.initState.data ?? [])] } } }
            set((s) => ({ nodes: [...s.nodes, node], isDirty: true })); get()._simulate(); return node.id
        },
        writeRomByte: (nodeId, addr, value) => {
            set((s) => ({ nodes: s.nodes.map((n) => { if (n.id !== nodeId) return n; const d = n.data as Record<string, unknown>; const ms = d.memState as { data: number[] } | undefined; if (!ms) return n; const newData = [...ms.data]; newData[addr] = value; return { ...n, data: { ...d, memState: { ...ms, data: newData } } } }), isDirty: true }))
            get()._simulate()
        },
        addAluNode: (type, position) => {
            get().saveHistory(); const def = ALU_DEFS[type]; nodeCounter += 1
            const node: Node = { id: `${type.toLowerCase()}-${nodeCounter}`, type: 'aluNode', position, data: { aluType: type, inputValues: Array(def?.inputs.length ?? 2).fill(0), outputValues: Array(def?.outputs.length ?? 1).fill(0) } }
            set((s) => ({ nodes: [...s.nodes, node], isDirty: true })); get()._simulate(); return node.id
        },
        addCpuNode: (position) => {
            get().saveHistory(); nodeCounter += 1
            const node: Node = { id: `cpu4-${nodeCounter}`, type: 'cpuNode', position, data: { cpuType: 'CPU_4BIT', inputValues: [0, 0], outputValues: Array(8).fill(0), cpuState: makeCpuState(), asmSource: DEFAULT_SOURCE } }
            set((s) => ({ nodes: [...s.nodes, node], isDirty: true })); return node.id
        },
        updateCpuProgram: (nodeId, program) => {
            set((s) => ({ nodes: s.nodes.map((n) => { if (n.id !== nodeId) return n; const d = n.data as Record<string, unknown>; const cs = (d.cpuState as CpuState | undefined) ?? makeCpuState(); return { ...n, data: { ...d, cpuState: { ...cs, program: [...program, ...Array(16).fill(0)].slice(0, 16), pc: 0, halted: false, executionLog: ['[PROGRAM LOADED]'] } } } }), isDirty: true }))
        },
        stepCpuManual: (nodeId) => {
            set((s) => ({ nodes: s.nodes.map((n) => { if (n.id !== nodeId) return n; const d = n.data as Record<string, unknown>; const cs = (d.cpuState as CpuState | undefined) ?? makeCpuState(); const nextCs = cpuStep(cs); const outBits: (0 | 1)[] = [((nextCs.output >> 3) & 1) as 0 | 1, ((nextCs.output >> 2) & 1) as 0 | 1, ((nextCs.output >> 1) & 1) as 0 | 1, (nextCs.output & 1) as 0 | 1, nextCs.flags.Z, nextCs.flags.N, nextCs.flags.C, nextCs.halted ? 1 : 0]; return { ...n, data: { ...d, cpuState: nextCs, outputValues: outBits } } }), isDirty: true }))
        },
        resetCpuNode: (nodeId) => {
            set((s) => ({ nodes: s.nodes.map((n) => { if (n.id !== nodeId) return n; const d = n.data as Record<string, unknown>; const cs = (d.cpuState as CpuState | undefined) ?? makeCpuState(); return { ...n, data: { ...d, cpuState: makeCpuState(cs.program), outputValues: Array(8).fill(0) } } }) }))
        },

        // ─── Simulation ───────────────────────────────────────────────────────────
        _simulate: () => {
            const { nodes, edges, delayMode } = get()
            if (nodes.length === 0 && edges.length === 0) return
            if (delayMode) { get()._simulateWithDelay(); return }
            const { nodes: simNodes, edgeSignals } = runSimulation(nodes, edges)
            const updatedEdges = edges.map((e) => ({ ...e, type: 'signalEdge', data: { ...(e.data as object), signal: edgeSignals.get(e.id) ?? 0 } }))
            set({ nodes: simNodes, edges: updatedEdges })
        },

        _simulateWithDelay: () => {
            const { nodes, edges, gateDelay } = get()
            if (nodes.length === 0) return
            const { nodes: finalNodes, edgeSignals } = runSimulation(nodes, edges)
            const edgeLevels = getEdgeLevelMap(nodes, edges)
            const maxLevel = Math.max(0, ...Array.from(edgeLevels.values()))
            const resetEdges = edges.map((e) => ({ ...e, type: 'signalEdge', data: { ...(e.data as object), signal: 0 } }))
            set({ isSimulating: true, edges: resetEdges })
            for (let lvl = 0; lvl <= maxLevel; lvl++) {
                const level = lvl
                setTimeout(() => { set((s) => ({ edges: s.edges.map((e) => { if ((edgeLevels.get(e.id) ?? 0) > level) return e; return { ...e, type: 'signalEdge', data: { ...(e.data as object), signal: edgeSignals.get(e.id) ?? 0 } } }) })) }, level * gateDelay)
            }
            setTimeout(() => set({ nodes: finalNodes, isSimulating: false }), (maxLevel + 1) * gateDelay)
        },

        // ─── History ──────────────────────────────────────────────────────────────
        saveHistory: () => {
            const { nodes, edges, past } = get()
            const snap: Snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }
            set({ past: [...past, snap].slice(-MAX_HISTORY), future: [] })
        },
        undo: () => {
            const { past, nodes, edges, future } = get()
            if (!past.length) return
            const prev = past[past.length - 1]
            const cur: Snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }
            set({ past: past.slice(0, -1), nodes: prev.nodes, edges: prev.edges, future: [cur, ...future].slice(0, MAX_HISTORY), isDirty: true })
            get()._simulate()
        },
        redo: () => {
            const { past, nodes, edges, future } = get()
            if (!future.length) return
            const next = future[0]
            const cur: Snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }
            set({ future: future.slice(1), nodes: next.nodes, edges: next.edges, past: [...past, cur].slice(-MAX_HISTORY), isDirty: true })
            get()._simulate()
        },
        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,
        clearCircuit: () => {
            get().saveHistory()
            set({ nodes: [], edges: [], selectedNodeId: null, isDirty: true, timingData: new Map(), timingTick: 0, clockRunning: false })
        },
        newProject: () => set({ nodes: [], edges: [], past: [], future: [], projectName: 'Untitled Circuit', isDirty: false, selectedNodeId: null, timingData: new Map(), timingTick: 0, clockRunning: false }),
    }))
)

// ─── Init theme from localStorage ─────────────────────────────────────────────
try {
    const saved = localStorage.getItem('lgs-theme') as Theme | null
    useCircuitStore.getState().setTheme(saved ?? 'dark')
} catch { /* ignore */ }
