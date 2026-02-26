import { useState } from 'react'
import { useCircuitStore } from '../../store/circuitStore'
import { TruthTable } from '../panels/TruthTable'
import {
    PanelRightClose, PanelRightOpen, Info,
    TableProperties, Zap, Hash,
} from 'lucide-react'
import type { GateType } from '../../engine/gateLogic'
import type { ComboType } from '../../engine/combinationalLogic'
import type { SeqType } from '../../engine/sequentialLogic'
import type { MemType } from '../../engine/memoryLogic'
import type { AluType } from '../../engine/aluLogic'
import { COMBO_DEFS } from '../../engine/combinationalLogic'
import { SEQ_DEFS } from '../../engine/sequentialLogic'
import { MEM_DEFS } from '../../engine/memoryLogic'
import { ALU_DEFS } from '../../engine/aluLogic'
import { disassemble } from '../../engine/cpuLogic'

type NodeTab = 'info' | 'truth'

function row(label: string, value: React.ReactNode) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, maxWidth: 120, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
        </div>
    )
}

function NodeInspector() {
    const { selectedNodeId, nodes } = useCircuitStore()
    const [tab, setTab] = useState<NodeTab>('info')
    const node = nodes.find((n) => n.id === selectedNodeId)
    const data = node?.data as Record<string, unknown> | undefined

    if (!node || !data) {
        return (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                <Info size={28} color="var(--text-3)" style={{ marginBottom: 8 }} />
                <div>Select a node to inspect its properties and truth table</div>
            </div>
        )
    }

    const gateType = data.gateType as GateType | undefined
    const componentType = data.componentType as ComboType | undefined
    const seqType = data.seqType as SeqType | undefined
    const memType = data.memType as MemType | undefined
    const aluType = data.aluType as AluType | undefined
    const isCpuNode = node.type === 'cpuNode'

    const canShowTruth = !!(gateType && gateType !== 'INPUT' && gateType !== 'OUTPUT' && gateType !== 'CLOCK') || !!componentType

    // Determine human-readable type & IO counts
    let typeName = 'Unknown'
    let inputs = (data.inputValues as (0 | 1)[] | undefined)?.length ?? 0
    let outputs = 1

    if (gateType === 'INPUT') { typeName = 'Switch (Input)'; inputs = 0; outputs = 1 }
    else if (gateType === 'OUTPUT') { typeName = 'LED (Output)'; inputs = 1; outputs = 0 }
    else if (gateType === 'CLOCK') { typeName = 'Clock Generator'; inputs = 0; outputs = 1 }
    else if (gateType) { typeName = `${gateType} Gate`; outputs = 1 }
    else if (componentType) { const d = COMBO_DEFS[componentType]; typeName = d?.name ?? componentType; inputs = d?.inputs.length ?? 0; outputs = d?.outputs.length ?? 1 }
    else if (seqType) { const d = SEQ_DEFS[seqType]; typeName = d?.name ?? seqType; inputs = d?.inputs.length ?? 0; outputs = d?.outputs.length ?? 1 }
    else if (memType) { const d = MEM_DEFS[memType]; typeName = d?.name ?? memType; inputs = d?.inputs.length ?? 0; outputs = d?.outputs.length ?? 1 }
    else if (aluType) { const d = ALU_DEFS[aluType]; typeName = d?.name ?? aluType; inputs = d?.inputs.length ?? 0; outputs = d?.outputs.length ?? 1 }
    else if (isCpuNode) { typeName = '4-bit CPU'; inputs = 2; outputs = 8 }

    const inputValues = (data.inputValues as (0 | 1)[] | undefined) ?? []
    const outputValues = (data.outputValues as (0 | 1)[] | undefined) ?? []
    const outputValue = data.outputValue as 0 | 1 | undefined

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                {[['info', Info, 'Info'], ...(canShowTruth ? [['truth', TableProperties, 'Truth']] : [])].map(([key, Icon, label]) => (
                    <button key={key as string} onClick={() => setTab(key as NodeTab)}
                        style={{ flex: 1, padding: '7px 4px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent', color: tab === key ? 'var(--accent)' : 'var(--text-3)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Icon size={11} />
                        {label as string}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
                {tab === 'info' && (
                    <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {row('Type', typeName)}
                            {row('Node ID', node.id)}
                            {row('Inputs', inputs)}
                            {row('Outputs', outputs)}
                            {row('Position', `(${Math.round(node.position.x)}, ${Math.round(node.position.y)})`)}
                        </div>

                        {/* Current signal values */}
                        {inputValues.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Current Inputs</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {inputValues.map((v, i) => (
                                        <span key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 7px', borderRadius: 4, background: v === 1 ? 'rgba(0,255,157,0.15)' : 'var(--bg-surface-3)', color: v === 1 ? '#00ff9d' : 'var(--text-3)', border: `1px solid ${v === 1 ? 'rgba(0,255,157,0.3)' : 'transparent'}` }}>
                                            {i}:{v}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(outputValues.length > 0 || outputValue !== undefined) && (
                            <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Current Outputs</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {outputValues.length > 0
                                        ? outputValues.map((v, i) => (
                                            <span key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 7px', borderRadius: 4, background: v === 1 ? 'rgba(0,212,255,0.15)' : 'var(--bg-surface-3)', color: v === 1 ? 'var(--accent)' : 'var(--text-3)', border: `1px solid ${v === 1 ? 'rgba(0,212,255,0.3)' : 'transparent'}` }}>
                                                {i}:{v}
                                            </span>
                                        ))
                                        : (
                                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 7px', borderRadius: 4, background: outputValue === 1 ? 'rgba(0,212,255,0.15)' : 'var(--bg-surface-3)', color: outputValue === 1 ? 'var(--accent)' : 'var(--text-3)', border: `1px solid ${outputValue === 1 ? 'rgba(0,212,255,0.3)' : 'transparent'}` }}>
                                                {outputValue}
                                            </span>
                                        )
                                    }
                                </div>
                            </div>
                        )}

                        {/* CPU mini-status */}
                        {isCpuNode && (() => {
                            const cs = data.cpuState as { pc?: number; ir?: number; halted?: boolean; cycle?: number; registers?: number[]; flags?: Record<string, number> } | undefined
                            if (!cs) return null
                            return (
                                <div style={{ marginTop: 10 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>CPU State</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                        {row('PC', `0x${(cs.pc ?? 0).toString(16).toUpperCase().padStart(2, '0')}`)}
                                        {row('Instruction', disassemble(cs.ir ?? 0))}
                                        {row('Cycle', cs.cycle ?? 0)}
                                        {row('Status', cs.halted ? 'HALTED' : 'Running')}
                                        {cs.registers && row('Registers', cs.registers.map((r, i) => `R${i}=${r.toString(16).toUpperCase()}`).join(' '))}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                )}

                {tab === 'truth' && <TruthTable />}
            </div>
        </div>
    )
}

// ─── Keyboard shortcuts reference ─────────────────────────────────────────────
const SHORTCUTS = [
    ['Ctrl+S', 'Save project'],
    ['Ctrl+O', 'Open project'],
    ['Ctrl+N', 'New project'],
    ['Ctrl+Z', 'Undo'],
    ['Ctrl+Y', 'Redo'],
    ['Ctrl+B', 'Toggle left panel'],
    ['Ctrl+T', 'Timing diagram'],
    ['Ctrl+D', 'Toggle delay mode'],
    ['Space', 'Start / Stop clock'],
    ['Delete', 'Delete selected'],
    ['Esc', 'Close panel'],
    ['F1', 'Help'],
]

function ShortcutsTab() {
    return (
        <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Keyboard Shortcuts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {SHORTCUTS.map(([key, desc]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{desc}</span>
                        <kbd style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, background: 'var(--bg-surface-3)', border: '1px solid var(--border-hi)', borderRadius: 4, padding: '1px 6px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{key}</kbd>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── RightPanel ───────────────────────────────────────────────────────────────
type PanelTab = 'node' | 'keys'

export function RightPanel() {
    const { rightPanelOpen, toggleRightPanel, selectedNodeId } = useCircuitStore()
    const [panelTab, setPanelTab] = useState<PanelTab>('node')

    return (
        <>
            {!rightPanelOpen && (
                <button className="btn btn-ghost btn-icon" onClick={toggleRightPanel}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <PanelRightOpen size={16} />
                </button>
            )}
            <aside style={{ width: rightPanelOpen ? 'var(--panel-right-w, 240px)' : 0, overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', transition: 'width 0.2s ease', zIndex: 10 }}>
                <div className="panel-header">
                    <div style={{ display: 'flex', gap: 0 }}>
                        <button onClick={() => setPanelTab('node')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: panelTab === 'node' ? 'var(--accent)' : 'var(--text-3)', padding: '0 8px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Hash size={12} />Inspector
                        </button>
                        <button onClick={() => setPanelTab('keys')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: panelTab === 'keys' ? 'var(--accent)' : 'var(--text-3)', padding: '0 0 0 8px', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Zap size={12} />Keys
                        </button>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleRightPanel}><PanelRightClose size={14} /></button>
                </div>

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {panelTab === 'node' ? <NodeInspector /> : <ShortcutsTab />}
                </div>
            </aside>
        </>
    )
}
