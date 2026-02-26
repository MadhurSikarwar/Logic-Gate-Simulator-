import { useState, useCallback } from 'react'
import { X, Database, Edit3, RefreshCw, Download } from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'
import { MEM_DEFS } from '../../engine/memoryLogic'
import type { MemoryNodeData } from '../memory/MemoryNode'

const COLS = 8  // bytes per row in hex dump

export function MemoryViewer() {
    const { nodes, memViewerId, setMemViewerId, writeRomByte } = useCircuitStore()
    const node = nodes.find((n) => n.id === memViewerId)
    const d = node?.data as MemoryNodeData | undefined
    if (!d || !memViewerId) return null

    const def = MEM_DEFS[d.memType]
    if (!def) return null

    const memData = d.memState?.data ?? Array(def.memSize).fill(0)
    const [editingIdx, setEditingIdx] = useState<number | null>(null)
    const [editVal, setEditVal] = useState('')

    const startEdit = useCallback((idx: number) => {
        if (!def.isROM) return  // ROM is editable at design time; RAM shows live values
        setEditingIdx(idx)
        setEditVal(memData[idx]?.toString(16).toUpperCase() ?? '0')
    }, [def.isROM, memData])

    const commitEdit = useCallback((idx: number) => {
        const v = parseInt(editVal, 16)
        const max = (1 << def.dataWidth) - 1
        if (!isNaN(v) && v >= 0 && v <= max) {
            writeRomByte(memViewerId, idx, v)
        }
        setEditingIdx(null)
        setEditVal('')
    }, [editVal, def.dataWidth, memViewerId, writeRomByte])

    // Current address being activated (for highlight)
    const curAddrBits = d.inputValues?.slice(def.hasClk ? 1 : 0, def.hasClk ? 1 + Math.log2(def.memSize) : Math.log2(def.memSize))
    const curAddr = curAddrBits ? curAddrBits.reduce((acc, v, i) => acc | ((v as number) << (curAddrBits.length - 1 - i)), 0) : -1

    const hexW = Math.ceil(def.dataWidth / 4)  // hex chars per value (1 or 2)
    const rows = Math.ceil(def.memSize / COLS)

    const categoryColors: Record<string, string> = {
        ROM: '#ff8c42', RAM: '#38bdf8', REG: '#c084fc', STK: '#4ade80', FIF: '#2dd4bf'
    }
    const cat = d.memType.startsWith('ROM') ? 'ROM' : d.memType.startsWith('RAM') ? 'RAM' : d.memType === 'REG_FILE' ? 'REG' : d.memType === 'STACK' ? 'STK' : 'FIF'
    const accent = categoryColors[cat] ?? 'var(--accent)'

    return (
        <>
            <div onClick={() => setMemViewerId(null)}
                style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            />
            <div style={{
                position: 'fixed', zIndex: 1001, top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 560, maxHeight: '82vh',
                background: 'var(--bg-surface)', border: `1px solid ${accent}44`,
                borderRadius: 12, boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${accent}22`,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderBottom: `1px solid ${accent}22`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `linear-gradient(135deg, ${accent}44, ${accent}22)`,
                            border: `1px solid ${accent}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Database size={16} color={accent} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: accent }}>{def.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                                {def.memSize} addresses × {def.dataWidth} bits
                                {def.isROM ? ' · Click a cell to edit' : ' · Live RAM view'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {def.isROM && (
                            <button className="btn btn-ghost btn-icon btn-sm" title="Reset to defaults"
                                onClick={() => {
                                    def.initState.data.forEach((v, i) => writeRomByte(memViewerId, i, v))
                                }}>
                                <RefreshCw size={13} />
                            </button>
                        )}
                        <button className="btn btn-ghost btn-icon" onClick={() => setMemViewerId(null)}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Hex dump body */}
                <div style={{ overflow: 'auto', flex: 1, padding: '12px 16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'right', padding: '4px 10px 8px 0', color: 'var(--text-3)', fontSize: 10, fontWeight: 600 }}>ADDR</th>
                                {Array.from({ length: Math.min(COLS, def.memSize) }, (_, c) => (
                                    <th key={c} style={{ textAlign: 'center', padding: '4px 4px 8px', color: 'var(--text-3)', fontSize: 10, fontWeight: 600 }}>
                                        {c.toString(16).toUpperCase()}
                                    </th>
                                ))}
                                <th style={{ padding: '4px 0 8px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 600 }}>ASCII</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: rows }, (_, row) => {
                                const baseAddr = row * COLS
                                const rowCells = Array.from({ length: Math.min(COLS, def.memSize - baseAddr) }, (_, c) => baseAddr + c)
                                return (
                                    <tr key={row} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ color: 'var(--text-3)', textAlign: 'right', padding: '5px 10px 5px 0', fontSize: 11 }}>
                                            {baseAddr.toString(16).toUpperCase().padStart(4, '0')}
                                        </td>
                                        {rowCells.map((addr) => {
                                            const val = memData[addr] ?? 0
                                            const isActive = addr === curAddr
                                            const isEditing = editingIdx === addr
                                            const hexStr = val.toString(16).toUpperCase().padStart(hexW, '0')
                                            return (
                                                <td key={addr} style={{ textAlign: 'center', padding: '3px 4px' }}>
                                                    {isEditing ? (
                                                        <input
                                                            autoFocus
                                                            value={editVal}
                                                            onChange={(e) => setEditVal(e.target.value.slice(0, hexW))}
                                                            onBlur={() => commitEdit(addr)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(addr); if (e.key === 'Escape') setEditingIdx(null) }}
                                                            style={{
                                                                width: 28, textAlign: 'center', background: `${accent}22`,
                                                                border: `1px solid ${accent}`, borderRadius: 3,
                                                                color: accent, fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                                                                outline: 'none', padding: '1px 2px',
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            onClick={() => startEdit(addr)}
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '2px 6px', borderRadius: 4,
                                                                cursor: def.isROM ? 'text' : 'default',
                                                                background: isActive ? `${accent}22` : 'transparent',
                                                                color: isActive ? accent : val !== 0 ? 'var(--text-1)' : 'var(--text-3)',
                                                                transition: 'background 0.1s',
                                                                minWidth: hexW * 7 + 4,
                                                            }}
                                                        >
                                                            {hexStr}
                                                        </span>
                                                    )}
                                                </td>
                                            )
                                        })}
                                        {/* ASCII section */}
                                        <td style={{ paddingLeft: 12, color: 'var(--text-3)', letterSpacing: '0.05em' }}>
                                            {rowCells.map((addr) => {
                                                const v = memData[addr] ?? 0
                                                const ch = v >= 32 && v < 127 ? String.fromCharCode(v) : '·'
                                                return <span key={addr} style={{ color: addr === curAddr ? accent : undefined }}>{ch}</span>
                                            })}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                        {def.memSize} words · {def.memSize * def.dataWidth} bits total
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Press <kbd className="kbd">Esc</kbd> to close</span>
                </div>
            </div>
        </>
    )
}
