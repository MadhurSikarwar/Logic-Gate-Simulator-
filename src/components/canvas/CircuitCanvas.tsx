import { useCallback, useRef } from 'react'
import {
    ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
    addEdge, Panel,
    type OnConnect, type OnMove, type OnSelectionChangeParams,
    ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCircuitStore } from '../../store/circuitStore'
import { GateNode } from '../gates/GateNode'
import { InputNode } from '../gates/InputNode'
import { OutputNode } from '../gates/OutputNode'
import { ComboNode } from '../combinational/ComboNode'
import { SeqNode } from '../sequential/SeqNode'
import { MemoryNode } from '../memory/MemoryNode'
import { AluNode } from '../alu/AluNode'
import { CpuNode } from '../cpu/CpuNode'
import { SignalEdge } from '../wires/SignalEdge'
import { useClockEngine } from '../../hooks/useClockEngine'
import type { GateType } from '../../engine/gateLogic'
import type { ComboType } from '../../engine/combinationalLogic'
import type { SeqType } from '../../engine/sequentialLogic'
import type { MemType } from '../../engine/memoryLogic'
import type { AluType } from '../../engine/aluLogic'
import { COMBO_DEFS } from '../../engine/combinationalLogic'
import { SEQ_DEFS } from '../../engine/sequentialLogic'
import { MEM_DEFS } from '../../engine/memoryLogic'
import { ALU_DEFS } from '../../engine/aluLogic'

const nodeTypes = {
    gateNode: GateNode, inputNode: InputNode, outputNode: OutputNode,
    comboNode: ComboNode, seqNode: SeqNode, memoryNode: MemoryNode,
    aluNode: AluNode, cpuNode: CpuNode,
}
const edgeTypes = { signalEdge: SignalEdge }

const GATE_TYPE_MAP: Record<string, GateType> = {
    'AND Gate': 'AND', 'OR Gate': 'OR', 'NOT Gate': 'NOT',
    'NAND Gate': 'NAND', 'NOR Gate': 'NOR', 'XOR Gate': 'XOR', 'XNOR Gate': 'XNOR',
    'Switch (Input)': 'INPUT', 'LED (Output)': 'OUTPUT', 'Clock': 'CLOCK',
}
const COMBO_TYPE_MAP: Record<string, ComboType> = Object.fromEntries(Object.values(COMBO_DEFS).map((d) => [d.name, d.type]))
const SEQ_TYPE_MAP: Record<string, SeqType> = Object.fromEntries(Object.values(SEQ_DEFS).map((d) => [d.name, d.type]))
const MEM_TYPE_MAP: Record<string, MemType> = Object.fromEntries(Object.values(MEM_DEFS).map((d) => [d.name, d.type]))
const ALU_TYPE_MAP: Record<string, AluType> = Object.fromEntries(Object.values(ALU_DEFS).map((d) => [d.name, d.type]))
const CPU_LABEL = '4-bit CPU'

function CanvasInner() {
    const {
        nodes, edges, onNodesChange, onEdgesChange, connectEdge,
        setZoom, setCursor, addGateNode, addComboNode, addSeqNode, addMemoryNode, addAluNode, addCpuNode,
        setSelectedNodeId, theme, isSimulating,
    } = useCircuitStore()

    const { screenToFlowPosition } = useReactFlow()
    const wrapperRef = useRef<HTMLDivElement>(null)
    useClockEngine()

    const onConnect = useCallback<OnConnect>(
        (conn) => {
            const merged = addEdge({ ...conn, id: `e-${Date.now()}`, type: 'signalEdge' }, edges)
            const newEdge = merged.find((e) => e.source === conn.source && e.target === conn.target)
            if (newEdge) connectEdge(newEdge)
        },
        [edges, connectEdge]
    )

    const onMoveEnd = useCallback<OnMove>((_e, vp) => setZoom(vp.zoom), [setZoom])

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setCursor(Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top))
    }, [setCursor])

    const onSelectionChange = useCallback(
        ({ nodes: sel }: OnSelectionChangeParams) => setSelectedNodeId(sel.length === 1 ? sel[0].id : null),
        [setSelectedNodeId]
    )

    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }, [])

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            const raw = e.dataTransfer.getData('text/plain')
            const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
            if (GATE_TYPE_MAP[raw]) { addGateNode(GATE_TYPE_MAP[raw]!, pos); return }
            if (COMBO_TYPE_MAP[raw]) { addComboNode(COMBO_TYPE_MAP[raw]!, pos); return }
            if (SEQ_TYPE_MAP[raw]) { addSeqNode(SEQ_TYPE_MAP[raw]!, pos); return }
            if (MEM_TYPE_MAP[raw]) { addMemoryNode(MEM_TYPE_MAP[raw]!, pos); return }
            if (ALU_TYPE_MAP[raw]) { addAluNode(ALU_TYPE_MAP[raw]!, pos); return }
            if (raw === CPU_LABEL) { addCpuNode(pos); return }
            if (raw in COMBO_DEFS) addComboNode(raw as ComboType, pos)
            else if (raw in SEQ_DEFS) addSeqNode(raw as SeqType, pos)
            else if (raw in MEM_DEFS) addMemoryNode(raw as MemType, pos)
            else if (raw in ALU_DEFS) addAluNode(raw as AluType, pos)
        },
        [addGateNode, addComboNode, addSeqNode, addMemoryNode, addAluNode, addCpuNode, screenToFlowPosition]
    )

    const isDark = theme === 'dark'

    return (
        <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}
            onMouseMove={handleMouseMove} onDragOver={onDragOver} onDrop={onDrop}
        >
            {isSimulating && (
                <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, pointerEvents: 'none' }}>
                    <span className="delay-badge">⚡ Propagating…</span>
                </div>
            )}
            <ReactFlow
                nodes={nodes} edges={edges}
                nodeTypes={nodeTypes} edgeTypes={edgeTypes}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onConnect={onConnect} onMoveEnd={onMoveEnd}
                onSelectionChange={onSelectionChange}
                snapToGrid snapGrid={[15, 15]}
                minZoom={0.05} maxZoom={5}
                fitView fitViewOptions={{ padding: 0.6 }}
                deleteKeyCode="Delete" multiSelectionKeyCode="Shift"
                panOnDrag={[1, 2]} zoomOnScroll zoomOnPinch connectionRadius={20}
                defaultEdgeOptions={{ type: 'signalEdge', data: { signal: 0 } }}
            >
                <Background variant={BackgroundVariant.Dots} gap={15} size={1.5} color={isDark ? '#1e2d44' : '#bfcbd9'} />
                <Controls position="bottom-right" style={{ bottom: 40 }} showInteractive={false} />
                <MiniMap
                    position="bottom-left" style={{ width: 160, height: 100, bottom: 8, left: 8 }}
                    nodeBorderRadius={4} nodeColor={isDark ? '#1e2d44' : '#bfcbd9'}
                    maskColor={isDark ? 'rgba(0,212,255,0.04)' : 'rgba(8,145,178,0.04)'}
                    zoomable pannable
                />
                {nodes.length === 0 && (
                    <Panel position="top-center" style={{ marginTop: 28, pointerEvents: 'none' }}>
                        <div className="canvas-hint">Drag a gate from the left panel onto the canvas to begin</div>
                    </Panel>
                )}
            </ReactFlow>
        </div>
    )
}

export function CircuitCanvas() {
    return (
        <ReactFlowProvider>
            <CanvasInner />
        </ReactFlowProvider>
    )
}
