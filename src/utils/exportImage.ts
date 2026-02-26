import type { Node, Edge } from '@xyflow/react'

// ─── PNG export via Canvas API ────────────────────────────────────────────────
// Renders a schematic-style canvas representation of the circuit.
// No external dependencies — pure Web API.

const NODE_W = 80
const NODE_H = 40
const PADDING = 60
const BG_COLOR = '#070b0f'
const GRID_COLOR = '#1a2235'
const WIRE_LOW_COLOR = '#2d4060'
const WIRE_HIGH_COLOR = '#00ff9d'
const TEXT_COLOR = '#e2e8f5'
const INPUT_COLOR = '#00d4ff'
const OUTPUT_COLOR = '#00ff9d'
const GATE_COLOR = '#1e2d44'
const GATE_BORDER = '#00d4ff'
const GATE_TEXT = '#e2e8f5'

type NodeData = Record<string, unknown>

function screenPos(node: Node): { x: number; y: number } {
    return { x: node.position.x, y: node.position.y }
}

export async function exportCircuitAsPng(
    nodes: Node[],
    edges: Edge[],
    name: string
): Promise<void> {
    if (nodes.length === 0) throw new Error('Canvas is empty — add some components first.')

    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach((n) => {
        minX = Math.min(minX, n.position.x)
        minY = Math.min(minY, n.position.y)
        maxX = Math.max(maxX, n.position.x + NODE_W)
        maxY = Math.max(maxY, n.position.y + NODE_H)
    })

    const width = Math.max(800, maxX - minX + PADDING * 2)
    const height = Math.max(500, maxY - minY + PADDING * 2)
    const ox = PADDING - minX
    const oy = PADDING - minY

    const canvas = document.createElement('canvas')
    canvas.width = width * 2   // 2× for retina
    canvas.height = height * 2
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)

    // Background
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, width, height)

    // Grid
    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 0.5
    for (let x = 0; x < width; x += 15) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
    for (let y = 0; y < height; y += 15) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }

    // Build output wire map for edges
    const sourcePos = new Map<string, { x: number; y: number }>()
    nodes.forEach((n) => {
        const p = screenPos(n)
        sourcePos.set(`${n.id}:output-0`, { x: p.x + ox + NODE_W, y: p.y + oy + NODE_H / 2 })
    })

    // Draw edges
    edges.forEach((e) => {
        const srcNode = nodes.find((n) => n.id === e.source)
        const tgtNode = nodes.find((n) => n.id === e.target)
        if (!srcNode || !tgtNode) return

        const sx = srcNode.position.x + ox + NODE_W
        const sy = srcNode.position.y + oy + NODE_H / 2
        const tx = tgtNode.position.x + ox
        const ty = tgtNode.position.y + oy + NODE_H / 2
        const signal = (e.data as { signal?: number })?.signal ?? 0

        ctx.strokeStyle = signal === 1 ? WIRE_HIGH_COLOR : WIRE_LOW_COLOR
        ctx.lineWidth = signal === 1 ? 2 : 1.5
        if (signal === 1) ctx.shadowBlur = 4, ctx.shadowColor = WIRE_HIGH_COLOR
        else ctx.shadowBlur = 0

        ctx.beginPath()
        ctx.moveTo(sx, sy)
        const mx = (sx + tx) / 2
        ctx.bezierCurveTo(mx, sy, mx, ty, tx, ty)
        ctx.stroke()

        ctx.shadowBlur = 0
    })

    // Draw nodes
    nodes.forEach((n) => {
        const data = n.data as NodeData
        const p = screenPos(n)
        const x = p.x + ox; const y = p.y + oy

        const gateType = data.gateType as string | undefined
        const isInput = gateType === 'INPUT'
        const isOutput = gateType === 'OUTPUT'
        const isClock = gateType === 'CLOCK'

        let fillColor = GATE_COLOR
        let borderColor = isInput ? INPUT_COLOR : isOutput ? OUTPUT_COLOR : GATE_BORDER
        if (isInput || isClock) fillColor = 'rgba(0,212,255,0.12)'
        if (isOutput) fillColor = 'rgba(0,255,157,0.12)'

        const outVal = data.outputValue as number | undefined
        const isHigh = outVal === 1 || (isOutput && (data.inputValues as number[] | undefined)?.[0] === 1)
        if (isHigh) { ctx.shadowBlur = 8; ctx.shadowColor = isOutput ? WIRE_HIGH_COLOR : GATE_BORDER }
        else ctx.shadowBlur = 0

        // Box
        ctx.fillStyle = fillColor
        ctx.strokeStyle = borderColor
        ctx.lineWidth = isHigh ? 2 : 1
        roundRect(ctx, x, y, NODE_W, NODE_H, 6)
        ctx.fill(); ctx.stroke()
        ctx.shadowBlur = 0

        // Label
        ctx.fillStyle = GATE_TEXT
        ctx.font = `bold 10px "JetBrains Mono", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label = gateType ?? (data.componentType ?? data.seqType ?? data.memType ?? data.aluType ?? (n.type === 'cpuNode' ? 'CPU' : '?')) as string
        ctx.fillText(label.slice(0, 10), x + NODE_W / 2, y + NODE_H / 2 - 6)

        // Signal value
        if (typeof outVal === 'number') {
            ctx.fillStyle = outVal === 1 ? '#00ff9d' : '#4a5568'
            ctx.font = `700 9px monospace`
            ctx.fillText(outVal === 1 ? '1' : '0', x + NODE_W / 2, y + NODE_H / 2 + 8)
        }
    })

    // Title
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(0,212,255,0.7)'
    ctx.font = `bold 11px "JetBrains Mono", monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`CircuitForge — ${name}`, 16, 12)

    // Export
    canvas.toBlob((blob) => {
        if (!blob) throw new Error('Failed to generate PNG')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'circuit'}.png`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
    }, 'image/png')
}

// ─── Rounded rectangle helper ─────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
}
