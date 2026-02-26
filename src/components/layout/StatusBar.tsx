import { useCircuitStore } from '../../store/circuitStore'
import { GitBranch, Activity, MousePointer2 } from 'lucide-react'

export function StatusBar() {
    const { zoom, cursorX, cursorY, nodes, edges, mode, isDirty, projectName } = useCircuitStore()

    const modeLabel: Record<string, string> = {
        select: 'Select',
        connect: 'Connect',
        pan: 'Pan',
    }

    return (
        <footer
            style={{
                height: 'var(--statusbar-h)',
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                zIndex: 100,
            }}
        >
            {/* Ready indicator */}
            <div className="status-item" style={{ gap: 7 }}>
                <div className="signal-dot" style={{ width: 6, height: 6 }} />
                <span style={{ color: 'var(--text-2)' }}>Ready</span>
            </div>

            {/* Mode */}
            <div className="status-item">
                <MousePointer2 size={11} />
                <span style={{ color: 'var(--text-2)' }}>{modeLabel[mode] ?? mode}</span>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Project + dirty */}
            <div className="status-item" style={{ borderLeft: 'none' }}>
                {isDirty && (
                    <span style={{ color: 'var(--warning)', marginRight: 4 }}>●</span>
                )}
                <span style={{ color: 'var(--text-2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {projectName}
                </span>
            </div>

            {/* Nodes / Edges */}
            <div className="status-item">
                <GitBranch size={11} />
                <span>{nodes.length} gates</span>
                <span style={{ opacity: 0.4, margin: '0 2px' }}>|</span>
                <span>{edges.length} wires</span>
            </div>

            {/* Cursor */}
            <div className="status-item">
                <span>x: {cursorX}</span>
                <span style={{ opacity: 0.4 }}>,</span>
                <span>y: {cursorY}</span>
            </div>

            {/* Zoom */}
            <div className="status-item">
                <Activity size={11} />
                <span>{Math.round(zoom * 100)}%</span>
            </div>
        </footer>
    )
}
