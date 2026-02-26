import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Play, SkipForward, RotateCcw, Code2, Cpu, Terminal, BookOpen } from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'
import { disassemble, assembleCpu, type CpuState } from '../../engine/cpuLogic'
import type { CpuNodeData } from '../cpu/CpuNode'

const REG_NAMES = ['R0', 'R1', 'R2', 'R3']

function hex(n: number, digits = 2) {
    return n.toString(16).toUpperCase().padStart(digits, '0')
}

function toBin4(n: number) {
    return (n & 0xF).toString(2).padStart(4, '0')
}

// ─── Register display ──────────────────────────────────────────────────────────
function RegDisplay({ name, value }: { name: string; value: number }) {
    const nz = value !== 0
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
            background: nz ? 'rgba(0,255,157,0.06)' : 'var(--bg-surface-2)', borderRadius: 6,
            border: `1px solid ${nz ? 'rgba(0,255,157,0.2)' : 'var(--border)'}`, transition: 'all 0.15s'
        }}>
            <span style={{ width: 24, fontSize: 11, fontWeight: 700, color: nz ? '#00ff9d' : 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{name}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: nz ? '#00ff9d' : 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>{toBin4(value)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{hex(value, 1)}h</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', width: 16, textAlign: 'right' }}>{value}</span>
        </div>
    )
}

// ─── Instruction row ───────────────────────────────────────────────────────────
function InstrRow({ addr, instr, isCurrent, isBreakpoint }:
    { addr: number; instr: number; isCurrent: boolean; isBreakpoint: boolean }) {
    const mnem = disassemble(instr)
    return (
        <tr style={{ background: isCurrent ? 'rgba(244,63,94,0.12)' : 'transparent', transition: 'background 0.1s' }}>
            <td style={{ padding: '3px 6px', width: 20, textAlign: 'center', color: isCurrent ? '#f43f5e' : 'var(--text-3)', fontFamily: 'monospace', fontSize: 11 }}>
                {isBreakpoint ? '●' : isCurrent ? '▶' : ''}
            </td>
            <td style={{ padding: '3px 6px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-3)', width: 30 }}>
                {hex(addr)}
            </td>
            <td style={{ padding: '3px 6px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: instr !== 0 ? 'var(--text-2)' : 'var(--text-3)' }}>
                {hex(instr)}
            </td>
            <td style={{ padding: '3px 6px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isCurrent ? '#f43f5e' : 'var(--text-1)', fontWeight: isCurrent ? 700 : 400 }}>
                {mnem}
            </td>
        </tr>
    )
}

// ─── CpuPanel ────────────────────────────────────────────────────────────────
export function CpuPanel() {
    const { nodes, cpuPanelId, setCpuPanelId, updateCpuProgram, stepCpuManual, resetCpuNode } = useCircuitStore()
    const node = nodes.find((n) => n.id === cpuPanelId)
    const d = node?.data as CpuNodeData | undefined

    const [tab, setTab] = useState<'debug' | 'asm'>('debug')
    const [asmSource, setAsmSource] = useState('')
    const [asmErrors, setAsmErrors] = useState<string[]>([])
    const [runMode, setRunMode] = useState(false)
    const runRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const logRef = useRef<HTMLDivElement>(null)

    if (!d || !cpuPanelId) return null
    const cs = d.cpuState ?? null
    if (!cs) return null

    const handleAssemble = useCallback(() => {
        const result = assembleCpu(asmSource)
        setAsmErrors(result.errors)
        if (result.errors.length === 0) {
            updateCpuProgram(cpuPanelId, result.program)
            setTab('debug')
        }
    }, [asmSource, cpuPanelId, updateCpuProgram])

    const handleStep = useCallback(() => {
        stepCpuManual(cpuPanelId)
    }, [cpuPanelId, stepCpuManual])

    const handleReset = useCallback(() => {
        resetCpuNode(cpuPanelId)
        setRunMode(false)
        if (runRef.current) { clearInterval(runRef.current); runRef.current = null }
    }, [cpuPanelId, resetCpuNode])

    useEffect(() => {
        if (runMode && !cs.halted) {
            runRef.current = setInterval(() => stepCpuManual(cpuPanelId), 300)
        } else {
            if (runRef.current) { clearInterval(runRef.current); runRef.current = null }
            if (cs.halted) setRunMode(false)
        }
        return () => { if (runRef.current) clearInterval(runRef.current) }
    }, [runMode, cs.halted, cpuPanelId, stepCpuManual])

    // Scroll log to bottom
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }, [cs.executionLog.length])

    const outVal = d.outputValues
        ? ((d.outputValues[0] ?? 0) << 3) | ((d.outputValues[1] ?? 0) << 2) | ((d.outputValues[2] ?? 0) << 1) | (d.outputValues[3] ?? 0)
        : cs.output

    return (
        <>
            <div onClick={() => { setCpuPanelId(null); setRunMode(false) }}
                style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
            <div style={{
                position: 'fixed', zIndex: 1001, top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 820, maxHeight: '88vh',
                background: 'var(--bg-surface)', border: '1px solid rgba(244,63,94,0.35)',
                borderRadius: 14, boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(244,63,94,0.15)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: '1px solid rgba(244,63,94,0.2)',
                    background: 'linear-gradient(135deg, #1a0010, var(--bg-surface))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, #f43f5e44, #f43f5e22)',
                            border: '1px solid rgba(244,63,94,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Cpu size={18} color="#f43f5e" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#f43f5e' }}>4-bit SimpleISA CPU</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                                Cycle {cs.cycle} · PC:{hex(cs.pc)} · {cs.halted ? 'HALTED' : 'Running'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {/* Controls */}
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={handleReset} title="Reset CPU">
                            <RotateCcw size={14} />
                        </button>
                        <button
                            className={`btn btn-icon btn-sm ${runMode ? 'btn-warning' : 'btn-primary'}`}
                            onClick={() => setRunMode((r) => !r)}
                            disabled={cs.halted}
                            title={runMode ? 'Pause' : 'Run'}
                            style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                            {runMode ? <span>⏸</span> : <Play size={12} />}
                            {runMode ? 'Pause' : 'Run'}
                        </button>
                        <button
                            className="btn btn-secondary btn-sm btn-icon"
                            onClick={handleStep}
                            disabled={cs.halted || runMode}
                            title="Step (execute one instruction)"
                            style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            <SkipForward size={12} /> Step
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => { setCpuPanelId(null); setRunMode(false) }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
                    {[['debug', BookOpen, 'Debugger'], ['asm', Code2, 'Assembly']].map(([key, Icon, label]) => (
                        <button key={key as string} onClick={() => setTab(key as typeof tab)}
                            style={{
                                padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                                color: tab === key ? '#f43f5e' : 'var(--text-2)',
                                borderBottom: tab === key ? '2px solid #f43f5e' : '2px solid transparent',
                            }}>
                            <Icon size={13} color={tab === key ? '#f43f5e' : 'var(--text-2)'} />
                            {label as string}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                    {tab === 'debug' && (
                        <>
                            {/* Left: Registers + Status */}
                            <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
                                {/* Registers */}
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Registers • BIN / HEX / DEC</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {REG_NAMES.map((n, i) => <RegDisplay key={n} name={n} value={cs.registers[i] ?? 0} />)}
                                    </div>
                                </div>

                                {/* Status */}
                                <div style={{ background: 'var(--bg-surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>CPU Status</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                                        {[
                                            ['PC', hex(cs.pc)], ['IR', hex(cs.ir)],
                                            ['Cycle', cs.cycle], ['OUT', `${hex(cs.output, 1)}h = ${cs.output}`],
                                        ].map(([lbl, val]) => (
                                            <div key={lbl as string}>
                                                <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase' }}>{lbl}</div>
                                                <div style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 700, marginTop: 1 }}>{val}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                                        {[['Z', cs.flags.Z], ['N', cs.flags.N], ['C', cs.flags.C]].map(([f, v]) => (
                                            <div key={f as string} style={{
                                                flex: 1, textAlign: 'center', padding: '5px 0',
                                                background: v ? 'rgba(251,191,36,0.15)' : 'var(--bg-surface-3)',
                                                borderRadius: 6, border: `1px solid ${v ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                                                transition: 'all 0.15s',
                                            }}>
                                                <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' }}>{f}</div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: v ? '#fbbf24' : 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Middle: Instruction Memory */}
                            <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Instruction Memory
                                </div>
                                <div style={{ flex: 1, overflow: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            {cs.program.map((instr, addr) => (
                                                <InstrRow key={addr} addr={addr} instr={instr} isCurrent={addr === cs.pc} isBreakpoint={false} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right: Execution Log */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{
                                    padding: '10px 12px', borderBottom: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase'
                                }}>
                                    <Terminal size={11} />  Execution Log ({cs.executionLog.length} entries)
                                </div>
                                <div ref={logRef} style={{ flex: 1, overflow: 'auto', padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                                    {cs.executionLog.length === 0 && (
                                        <div style={{ color: 'var(--text-3)', marginTop: 16, textAlign: 'center' }}>
                                            Press Step or Run to execute instructions…
                                        </div>
                                    )}
                                    {cs.executionLog.map((entry, i) => (
                                        <div key={i} style={{
                                            padding: '2px 0', color: i === cs.executionLog.length - 1 ? '#00ff9d' : 'var(--text-2)',
                                            borderBottom: '1px solid var(--border)', lineHeight: '1.5',
                                        }}>
                                            {entry}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'asm' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 12, overflow: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                    Write assembly, then click <strong>Assemble</strong> to load it into the CPU. Immediate values: #0–#3.
                                </div>
                                <button className="btn btn-primary btn-sm"
                                    onClick={handleAssemble}
                                    style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Code2 size={13} /> Assemble
                                </button>
                            </div>
                            <textarea
                                value={asmSource}
                                onChange={(e) => setAsmSource(e.target.value)}
                                placeholder="Type assembly here...\n\nExample:\nSTART:\n  LOAD R0, #0\n  LOAD R1, #1\nLOOP:\n  ADD R0, R1\n  OUT R0\n  JMP LOOP\n  HLT"
                                style={{
                                    flex: 1, minHeight: 300,
                                    background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                                    borderRadius: 8, padding: 14,
                                    fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: 1.6,
                                    color: 'var(--text-1)', outline: 'none', resize: 'none',
                                }}
                            />
                            {asmErrors.length > 0 && (
                                <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 6, padding: 10 }}>
                                    {asmErrors.map((e, i) => (
                                        <div key={i} style={{ fontSize: 11, color: '#f43f5e', fontFamily: 'JetBrains Mono, monospace' }}>⚠ {e}</div>
                                    ))}
                                </div>
                            )}
                            {/* ISA reference */}
                            <details style={{ fontSize: 11, color: 'var(--text-2)' }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>ISA Quick Reference</summary>
                                <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.7 }}>{`NOP              — No operation
LOAD Rd, #n      — Rd = n  (n ∈ 0,1,2,3)
MOV  Rd, Rs      — Rd = Rs
ADD  Rd, Rs      — Rd = Rd + Rs  (sets Z,N,C)
SUB  Rd, Rs      — Rd = Rd - Rs  (sets Z,N)
AND  Rd, Rs      — Rd = Rd AND Rs
OR   Rd, Rs      — Rd = Rd OR  Rs
XOR  Rd, Rs      — Rd = Rd XOR Rs
NOT  Rd          — Rd = NOT Rd
INC  Rd          — Rd = Rd + 1   (sets Z,N,C)
DEC  Rd          — Rd = Rd - 1
JMP  label/addr  — PC = addr
JZ   label/addr  — if Z: PC = addr
JN   label/addr  — if N: PC = addr
OUT  Rd          — OUT = Rd
HLT              — halt execution`}</pre>
                            </details>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
