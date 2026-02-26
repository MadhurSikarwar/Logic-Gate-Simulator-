import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from '@xyflow/react'
import { useCircuitStore } from '../../store/circuitStore'

export interface SignalEdgeData {
    signal: 0 | 1
    isHazard?: boolean
    [key: string]: unknown
}

// ─── Particle dots that travel along the wire path ────────────────────────────
function SignalParticles({ edgePath, color }: { edgePath: string; color: string }) {
    // Three staggered particles at different offsets along the path
    const offsets = ['0%', '33%', '66%']
    return (
        <>
            {offsets.map((offset, i) => (
                <circle key={i} r={2.5} fill={color} opacity={0.9}
                    style={{ filter: `drop-shadow(0 0 3px ${color})` }}>
                    <animateMotion
                        dur="0.9s"
                        repeatCount="indefinite"
                        begin={`${i * -0.3}s`}
                        calcMode="linear"
                    >
                        <mpath xlinkHref={`#ep-${edgePath.slice(1, 12).replace(/\s/g, '')}`} />
                    </animateMotion>
                </circle>
            ))}
        </>
    )
}

/**
 * Custom animated ReactFlow edge.
 * - LOW (0): gray / blue solid line
 * - HIGH (1): green glowing dashed line + animated particles
 * - Hazard: orange/red flickering
 */
export function SignalEdge({
    id,
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    markerEnd,
}: EdgeProps) {
    const ed = data as Partial<SignalEdgeData>
    const signal: 0 | 1 = ed?.signal ?? 0
    const isHazard = ed?.isHazard ?? false
    const { theme } = useCircuitStore()

    const isHigh = signal === 1

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        borderRadius: 10,
        offset: 20,
    })

    // ── Theme-aware wire color ─────────────────────────────────────────
    let highColor = '#00ff9d'
    let lowColor = theme === 'dark' ? '#2d4060' : '#94a3b8'

    // Adjust for special themes
    if (theme === 'cyberpunk') { highColor = '#facc15'; lowColor = '#440066' }
    if (theme === 'blueprint') { highColor = '#7ef5ff'; lowColor = '#4080c0' }
    if (theme === 'pcb') { highColor = '#3dc45c'; lowColor = '#1a4a28' }

    const stroke = isHazard ? '#f59e0b' : isHigh ? highColor : lowColor
    const strokeWidth = selected ? 3 : 2

    const edgeStyle: React.CSSProperties = {
        stroke,
        strokeWidth,
        strokeDasharray: isHigh ? '12 6' : isHazard ? '6 4' : undefined,
        animation: isHigh
            ? 'wire-flow 0.5s linear infinite'
            : isHazard ? 'hazard-flash 0.4s ease infinite' : undefined,
        filter: isHigh
            ? `drop-shadow(0 0 3px ${highColor}aa)`
            : isHazard ? 'drop-shadow(0 0 4px #f59e0baa)' : 'none',
        transition: 'stroke 0.15s, stroke-width 0.1s',
    }

    const selectionStyle: React.CSSProperties = {
        stroke: 'transparent',
        strokeWidth: 14,
        fill: 'none',
    }

    // Use a short unique ID for the path def (needed for animateMotion mpath)
    const pathId = `ep-${id.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`

    return (
        <>
            {/* Invisible path def for animateMotion */}
            {isHigh && (
                <defs>
                    <path id={pathId} d={edgePath} />
                </defs>
            )}

            {/* Wide invisible selection area */}
            <path d={edgePath} style={selectionStyle} className="react-flow__edge-interaction" />

            {/* Visible wire */}
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={edgeStyle} />

            {/* Moving particle dots on HIGH signal */}
            {isHigh && (
                <>
                    {[0, 1, 2].map((i) => (
                        <circle key={i} r={2.8} fill={highColor} opacity={0.85}
                            style={{ filter: `drop-shadow(0 0 4px ${highColor})` }}>
                            <animateMotion
                                dur="1.0s"
                                repeatCount="indefinite"
                                begin={`${i * -0.33}s`}
                                calcMode="linear"
                                path={edgePath}
                            />
                        </circle>
                    ))}
                </>
            )}

            {/* Signal value label */}
            {(selected || isHigh) && (
                <EdgeLabelRenderer>
                    <div style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'none', zIndex: 10,
                    }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 16, height: 16, borderRadius: '50%',
                            background: isHigh ? highColor : 'var(--bg-surface-3)',
                            border: `1.5px solid ${isHigh ? highColor : 'var(--border-hi)'}`,
                            color: isHigh ? '#000' : 'var(--text-2)',
                            fontSize: 9, fontWeight: 800,
                            fontFamily: 'JetBrains Mono, monospace',
                            boxShadow: isHigh ? `0 0 8px ${highColor}aa` : 'none',
                        }}>
                            {signal}
                        </span>
                    </div>
                </EdgeLabelRenderer>
            )}

            {/* Hazard warning label */}
            {isHazard && (
                <EdgeLabelRenderer>
                    <div style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${(labelY ?? 0) - 14}px)`,
                        pointerEvents: 'none', zIndex: 10, fontSize: 10,
                        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.5)',
                        borderRadius: 4, padding: '1px 5px', color: '#f59e0b', fontWeight: 700,
                    }}>
                        ⚠ Hazard
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    )
}
