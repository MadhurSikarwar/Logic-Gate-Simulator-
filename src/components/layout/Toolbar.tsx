import {
    Cpu, Undo2, Redo2, FolderOpen, Save, Upload, Trash2,
    Sun, Moon, Keyboard, Play, Pause, Timer, Activity, Waves,
    Link2, ImageDown, FileCode2, Palette, BrainCircuit, FilePlus2,
} from 'lucide-react'
import { useCircuitStore } from '../../store/circuitStore'
import { Tooltip } from '../ui/Tooltip'
import { ThemePicker } from '../ui/ThemePicker'
import { useState } from 'react'

export function Toolbar() {
    const {
        theme, toggleTheme, toggleShortcuts, toggleStats, showStats,
        toggleTiming, showTiming,
        projectName, isDirty, canUndo, canRedo, undo, redo, clearCircuit,
        delayMode, toggleDelayMode, gateDelay, setGateDelay, isSimulating,
        clockRunning, toggleClock, clockFreq, setClockFreq,
        saveProject, openProject, newProject,
        shareProject, exportVerilog, exportPng, setShowExplainer,
    } = useCircuitStore()
    const [showThemePicker, setShowThemePicker] = useState(false)

    return (
        <header style={{
            height: 'var(--toolbar-h)', background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)', display: 'flex',
            alignItems: 'center', padding: '0 12px', gap: '4px',
            flexShrink: 0, zIndex: 100, overflow: 'hidden',
        }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 6, flexShrink: 0 }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--accent) 0%, #0066ff 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--accent-glow)',
                }}>
                    <Cpu size={18} color="#000" strokeWidth={2.5} />
                </div>
                <span className="logo-glow" style={{
                    fontWeight: 700, fontSize: 15, color: 'var(--accent)', letterSpacing: '-0.01em',
                    fontFamily: 'JetBrains Mono, monospace',
                }}>
                    CircuitForge
                </span>
            </div>

            <div className="sep" />

            {/* Project name */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
                height: 32, borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)', minWidth: 120, maxWidth: 180,
            }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {projectName}
                </span>
                {isDirty && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} title="Unsaved" />}
            </div>

            <div className="sep" />

            <Tooltip label="Undo" shortcut="Ctrl+Z">
                <button className="btn btn-ghost btn-icon" onClick={undo} disabled={!canUndo()}><Undo2 size={16} /></button>
            </Tooltip>
            <Tooltip label="Redo" shortcut="Ctrl+Y">
                <button className="btn btn-ghost btn-icon" onClick={redo} disabled={!canRedo()}><Redo2 size={16} /></button>
            </Tooltip>

            <div className="sep" />

            <Tooltip label="Open Project" shortcut="Ctrl+O"><button className="btn btn-ghost btn-icon" onClick={openProject}><FolderOpen size={15} /></button></Tooltip>
            <Tooltip label="Save Project" shortcut="Ctrl+S"><button className="btn btn-ghost btn-icon" onClick={saveProject}><Save size={15} /></button></Tooltip>
            <Tooltip label="New Project" shortcut="Ctrl+N"><button className="btn btn-ghost btn-icon" onClick={() => { if (isDirty) { if (confirm('Start a new project? Unsaved changes will be lost.')) newProject() } else newProject() }}><FilePlus2 size={15} /></button></Tooltip>
            <Tooltip label="Import (open file)"><button className="btn btn-ghost btn-icon" onClick={openProject}><Upload size={15} /></button></Tooltip>

            <div className="sep" />

            {/* ── Phase 10: Export & Share ──────────────────────── */}
            <Tooltip label="Share URL (copy to clipboard)"><button className="btn btn-ghost btn-icon" onClick={shareProject}><Link2 size={15} /></button></Tooltip>
            <Tooltip label="Export PNG"><button className="btn btn-ghost btn-icon" onClick={exportPng}><ImageDown size={15} /></button></Tooltip>
            <Tooltip label="Export Verilog (.v)"><button className="btn btn-ghost btn-icon" onClick={exportVerilog}><FileCode2 size={15} /></button></Tooltip>

            <div className="sep" />

            <Tooltip label="Clear Canvas">
                <button className="btn btn-ghost btn-icon" onClick={clearCircuit} style={{ color: 'var(--danger)' } as React.CSSProperties}>
                    <Trash2 size={15} />
                </button>
            </Tooltip>

            <div style={{ flex: 1 }} />

            {/* ── Phase 5: Clock Controls ────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
                height: 32, borderRadius: 'var(--radius)',
                background: clockRunning ? 'rgba(0,255,157,0.08)' : 'var(--bg-surface-2)',
                border: `1px solid ${clockRunning ? 'rgba(0,255,157,0.25)' : 'var(--border)'}`,
                transition: 'all 0.2s',
            }}>
                <Tooltip label={clockRunning ? 'Stop Clock' : 'Start Clock'}>
                    <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={toggleClock}
                        style={clockRunning ? { color: '#00ff9d' } as React.CSSProperties : undefined}
                    >
                        {clockRunning ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                    </button>
                </Tooltip>
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: clockRunning ? '#00ff9d' : 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {clockFreq} Hz
                </span>
                <input
                    type="range" className="delay-slider"
                    min={1} max={20} step={1}
                    value={clockFreq}
                    onChange={(e) => setClockFreq(Number(e.target.value))}
                    style={{ width: 60 }}
                    title={`Clock frequency: ${clockFreq} Hz`}
                />
            </div>

            {/* Phase 3: Propagation Delay */}
            {delayMode && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: 'var(--radius)', height: 32,
                }}>
                    <Timer size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--warning)', fontFamily: 'monospace', fontWeight: 600 }}>{gateDelay}ms</span>
                    <input type="range" className="delay-slider" min={50} max={800} step={50} value={gateDelay}
                        onChange={(e) => setGateDelay(Number(e.target.value))} style={{ width: 60 }} />
                </div>
            )}

            <Tooltip label={delayMode ? 'Disable Delay Mode' : 'Enable Propagation Delay'}>
                <button className={`btn btn-ghost btn-icon ${delayMode ? 'is-active' : ''}`} onClick={toggleDelayMode}
                    style={delayMode ? { color: 'var(--warning)' } as React.CSSProperties : undefined}>
                    <Timer size={16} />
                </button>
            </Tooltip>

            <Tooltip label={showTiming ? 'Hide Timing Diagram' : 'Show Timing Diagram'}>
                <button className={`btn btn-ghost btn-icon ${showTiming ? 'is-active' : ''}`} onClick={toggleTiming}>
                    <Waves size={16} />
                </button>
            </Tooltip>

            <Tooltip label={showStats ? 'Hide Stats' : 'Show Circuit Stats'}>
                <button className={`btn btn-ghost btn-icon ${showStats ? 'is-active' : ''}`} onClick={toggleStats}>
                    <Activity size={16} />
                </button>
            </Tooltip>

            <div className="sep" />

            <Tooltip label="Explain Circuit (AI Analysis)"><button className="btn btn-ghost btn-icon" onClick={() => setShowExplainer(true)}><BrainCircuit size={16} /></button></Tooltip>

            <div className="sep" />

            {/* Theme picker */}
            <div style={{ position: 'relative' }}>
                <Tooltip label="Visual Theme">
                    <button className="btn btn-ghost btn-icon" onClick={() => setShowThemePicker((p) => !p)}><Palette size={16} /></button>
                </Tooltip>
                {showThemePicker && <ThemePicker onClose={() => setShowThemePicker(false)} />}
            </div>

            <Tooltip label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                <button className="btn btn-ghost btn-icon" onClick={toggleTheme}>
                    {theme === 'dark' || theme === 'cyberpunk' || theme === 'pcb' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
            </Tooltip>
            <Tooltip label="Keyboard Shortcuts" shortcut="?">
                <button className="btn btn-ghost btn-icon" onClick={toggleShortcuts}>
                    <Keyboard size={16} />
                </button>
            </Tooltip>
        </header>
    )
}
