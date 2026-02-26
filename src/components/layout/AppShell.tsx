import { useCircuitStore } from '../../store/circuitStore'
import { Toolbar } from './Toolbar'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import { StatusBar } from './StatusBar'
import { CircuitCanvas } from '../canvas/CircuitCanvas'
import { KeyboardShortcutsPanel } from '../ui/KeyboardShortcutsPanel'
import { CircuitStats } from '../panels/CircuitStats'
import { TimingDiagram } from '../panels/TimingDiagram'
import { InternalViewModal } from '../combinational/InternalViewModal'
import { MemoryViewer } from '../panels/MemoryViewer'
import { CpuPanel } from '../panels/CpuPanel'
import { WelcomeModal } from '../ui/WelcomeModal'
import { CircuitExplainer } from '../panels/CircuitExplainer'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { loadFromUrlHash, clearUrlHash } from '../../utils/shareUrl'
import { useEffect } from 'react'

function ToastOverlay() {
    const { toastMessage } = useCircuitStore()
    if (!toastMessage) return null
    return (
        <div style={{
            position: 'fixed', bottom: 48, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, pointerEvents: 'none',
            background: 'var(--bg-surface)', border: '1px solid var(--border-hi)',
            borderRadius: 8, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.22s ease-out',
            whiteSpace: 'nowrap',
        }}>
            {toastMessage}
        </div>
    )
}

function AppShellInner() {
    useKeyboardShortcuts()
    const { shortcutsOpen, showStats, showTiming, internalViewId, memViewerId, cpuPanelId, showWelcome, showExplainer, loadProjectFromJSON } = useCircuitStore()

    // Load shared circuit from URL hash on first mount
    useEffect(() => {
        const circuit = loadFromUrlHash()
        if (circuit) { loadProjectFromJSON(circuit.nodes, circuit.edges, 'Shared Circuit'); clearUrlHash() }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'var(--bg-app)', overflow: 'hidden' }}>
            <Toolbar />
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                <LeftPanel />
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                        <CircuitCanvas />
                        {showStats && <CircuitStats />}
                    </div>
                    {showTiming && <TimingDiagram />}
                </div>
                <RightPanel />
            </div>
            <StatusBar />
            <ToastOverlay />
            {shortcutsOpen && <KeyboardShortcutsPanel />}
            {internalViewId && <InternalViewModal />}
            {memViewerId && <MemoryViewer />}
            {cpuPanelId && <CpuPanel />}
            {showWelcome && <WelcomeModal />}
            {showExplainer && <CircuitExplainer />}
        </div>
    )
}

export function AppShell() {
    return <AppShellInner />
}
