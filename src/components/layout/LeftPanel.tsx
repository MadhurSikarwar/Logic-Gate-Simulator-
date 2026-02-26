import { useState, useCallback } from 'react'
import {
    PanelLeftClose, PanelLeftOpen, Search, ChevronDown, ChevronRight,
    CircuitBoard, Layers, Radio, GitBranch, Database, Cpu, Microchip,
} from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'
import { COMBO_DEFS } from '../../engine/combinationalLogic'
import { SEQ_DEFS } from '../../engine/sequentialLogic'
import { MEM_DEFS } from '../../engine/memoryLogic'
import { ALU_DEFS } from '../../engine/aluLogic'

const GATE_ITEMS = [
    { label: 'AND Gate', icon: '∧', desc: 'OUT = A·B' },
    { label: 'OR Gate', icon: '∨', desc: 'OUT = A+B' },
    { label: 'NOT Gate', icon: '¬', desc: 'OUT = Ā' },
    { label: 'NAND Gate', icon: '⊼', desc: 'OUT = (A·B)′' },
    { label: 'NOR Gate', icon: '⊽', desc: 'OUT = (A+B)′' },
    { label: 'XOR Gate', icon: '⊕', desc: 'OUT = A⊕B' },
    { label: 'XNOR Gate', icon: '⊙', desc: 'OUT = (A⊕B)′' },
]
const IO_ITEMS = [
    { label: 'Switch (Input)', icon: '⏻', desc: 'Manual toggle' },
    { label: 'LED (Output)', icon: '●', desc: 'Signal indicator' },
    { label: 'Clock', icon: '⊡', desc: 'Clock oscillator' },
]
const COMBO_ITEMS = Object.values(COMBO_DEFS).map((d) => ({ label: d.name, type: d.type, desc: `${d.inputs.length}→${d.outputs.length}`, color: 'var(--accent)' }))
const SEQ_ITEMS = Object.values(SEQ_DEFS).map((d) => ({ label: d.name, type: d.type, desc: `${d.inputs.length}→${d.outputs.length}${d.hasClk ? ' · CLK' : ''}`, color: '#c084fc' }))
const MEM_ITEMS = Object.values(MEM_DEFS).map((d) => ({
    label: d.name, type: d.type,
    desc: `${d.memSize}×${d.dataWidth}b · ${d.isROM ? 'ROM' : 'RW'}`,
    color: d.type.startsWith('ROM') ? '#ff8c42' : d.type.startsWith('RAM') ? '#38bdf8' : d.type === 'REG_FILE' ? '#c084fc' : '#4ade80',
}))
const ALU_CAT_COLORS: Record<string, string> = { alu: '#38bdf8', multiply: '#a78bfa', shift: '#facc15', convert: '#34d399' }
const ALU_ITEMS = Object.values(ALU_DEFS).map((d) => ({
    label: d.name, type: d.type,
    desc: `${d.inputs.length}→${d.outputs.length}`,
    color: ALU_CAT_COLORS[d.category] ?? 'var(--accent)',
}))
const CPU_ITEMS = [
    { label: '4-bit CPU', desc: '16-op ISA · CLK/RST · debugger', color: '#f43f5e' },
]

function DraggableItem({ label, icon, desc }: { label: string; icon: string; desc: string }) {
    const onDragStart = useCallback(
        (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', label); e.dataTransfer.effectAllowed = 'copy' }, [label]
    )
    return (
        <div draggable onDragStart={onDragStart}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', cursor: 'grab', borderRadius: 6, transition: 'background 0.12s', userSelect: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: 'var(--bg-surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--accent)', fontFamily: 'monospace' }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{desc}</div>
            </div>
        </div>
    )
}

function ChipItem({ label, shortKey, desc, color = 'var(--accent)' }: { label: string; shortKey: string; desc: string; color?: string }) {
    const onDragStart = useCallback(
        (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', label); e.dataTransfer.effectAllowed = 'copy' }, [label]
    )
    return (
        <div draggable onDragStart={onDragStart}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', cursor: 'grab', borderRadius: 6, transition: 'background 0.12s', userSelect: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: `linear-gradient(135deg, ${color}18, ${color}08)`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>
                {shortKey.slice(0, 4)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{desc}</div>
            </div>
        </div>
    )
}

function CategorySection({ label, icon, children, initOpen = true }: { label: string; icon: React.ReactNode; children: React.ReactNode; initOpen?: boolean }) {
    const [open, setOpen] = useState(initOpen)
    return (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => setOpen((o) => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>
                <span style={{ color: 'var(--accent)' }}>{icon}</span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {open && <div className="anim-fade">{children}</div>}
        </div>
    )
}

export function LeftPanel() {
    const { leftPanelOpen, toggleLeftPanel } = useCircuitStore()
    const [search, setSearch] = useState('')
    const q = search.toLowerCase()

    const fGates = GATE_ITEMS.filter((g) => g.label.toLowerCase().includes(q))
    const fIO = IO_ITEMS.filter((g) => g.label.toLowerCase().includes(q))
    const fCombo = COMBO_ITEMS.filter((g) => g.label.toLowerCase().includes(q))
    const fSeq = SEQ_ITEMS.filter((g) => g.label.toLowerCase().includes(q))
    const fMem = MEM_ITEMS.filter((g) => g.label.toLowerCase().includes(q))
    const fAlu = ALU_ITEMS.filter((g) => g.label.toLowerCase().includes(q))
    const fCpu = CPU_ITEMS.filter((g) => g.label.toLowerCase().includes(q))
    const hasResults = [fGates, fIO, fCombo, fSeq, fMem, fAlu, fCpu].some((a) => a.length > 0)

    return (
        <>
            {!leftPanelOpen && (
                <button className="btn btn-ghost btn-icon" onClick={toggleLeftPanel} title="Ctrl+B"
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <PanelLeftOpen size={16} />
                </button>
            )}
            <aside style={{ width: leftPanelOpen ? 'var(--panel-left-w)' : 0, overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', transition: 'width 0.2s ease', zIndex: 10 }}>
                <div className="panel-header">
                    <span>Components</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleLeftPanel}><PanelLeftClose size={14} /></button>
                </div>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', height: 30 }}>
                        <Search size={12} color="var(--text-3)" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search components…"
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-1)', fontFamily: 'inherit' }} />
                    </div>
                </div>
                <div className="panel-scroll">
                    {!hasResults && search && (
                        <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No results for "{search}"</div>
                    )}
                    {fGates.length > 0 && (
                        <CategorySection label="Logic Gates" icon={<CircuitBoard size={13} />}>
                            {fGates.map((g) => <DraggableItem key={g.label} label={g.label} icon={g.icon} desc={g.desc} />)}
                        </CategorySection>
                    )}
                    {fIO.length > 0 && (
                        <CategorySection label="I/O Controls" icon={<Radio size={13} />}>
                            {fIO.map((g) => <DraggableItem key={g.label} label={g.label} icon={g.icon} desc={g.desc} />)}
                        </CategorySection>
                    )}
                    {fCombo.length > 0 && (
                        <CategorySection label="Combinational" icon={<Layers size={13} />} initOpen={false}>
                            {fCombo.map((c) => <ChipItem key={c.type} label={c.label} shortKey={c.type} desc={c.desc} color={c.color} />)}
                        </CategorySection>
                    )}
                    {fSeq.length > 0 && (
                        <CategorySection label="Sequential" icon={<GitBranch size={13} />} initOpen={false}>
                            {fSeq.map((s) => <ChipItem key={s.type} label={s.label} shortKey={s.type} desc={s.desc} color={s.color} />)}
                        </CategorySection>
                    )}
                    {fMem.length > 0 && (
                        <CategorySection label="Memory" icon={<Database size={13} />} initOpen={false}>
                            {fMem.map((m) => <ChipItem key={m.type} label={m.label} shortKey={m.type} desc={m.desc} color={m.color} />)}
                        </CategorySection>
                    )}
                    {fAlu.length > 0 && (
                        <CategorySection label="ALU & Math" icon={<Cpu size={13} />} initOpen={false}>
                            {fAlu.map((a) => <ChipItem key={a.type} label={a.label} shortKey={a.type} desc={a.desc} color={a.color} />)}
                        </CategorySection>
                    )}
                    {fCpu.length > 0 && (
                        <CategorySection label="CPU / Processor" icon={<Microchip size={13} />} initOpen={true}>
                            {fCpu.map((c) => <ChipItem key={c.label} label={c.label} shortKey="CPU4" desc={c.desc} color={c.color} />)}
                        </CategorySection>
                    )}
                </div>
                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>
                    Drag · Double-click memory/CPU to inspect
                </div>
            </aside>
        </>
    )
}
