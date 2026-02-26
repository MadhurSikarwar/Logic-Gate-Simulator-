import type { Node, Edge } from '@xyflow/react'

const HASH_PREFIX = '#circuit='

// ─── Encode circuit to URL-safe base64 ───────────────────────────────────────
export function encodeCircuit(nodes: Node[], edges: Edge[]): string {
    try {
        const payload = JSON.stringify({ nodes, edges })
        // Use btoa with URI encoding to handle non-ASCII data
        return btoa(encodeURIComponent(payload)
            .replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt('0x' + p1, 16))))
    } catch (err) {
        console.error('[shareUrl] encode failed:', err)
        throw new Error('Circuit is too large to encode as a URL (try saving as a file instead).')
    }
}

// ─── Decode circuit from base64 ───────────────────────────────────────────────
export function decodeCircuit(encoded: string): { nodes: Node[]; edges: Edge[] } | null {
    try {
        const json = decodeURIComponent(
            Array.from(atob(encoded), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
        )
        const obj = JSON.parse(json)
        if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null
        return { nodes: obj.nodes as Node[], edges: obj.edges as Edge[] }
    } catch (err) {
        console.error('[shareUrl] decode failed:', err)
        return null
    }
}

// ─── Build share URL ──────────────────────────────────────────────────────────
export function buildShareUrl(nodes: Node[], edges: Edge[]): string {
    const origin = window.location.origin + window.location.pathname
    return `${origin}${HASH_PREFIX}${encodeCircuit(nodes, edges)}`
}

// ─── Copy share URL to clipboard ─────────────────────────────────────────────
export async function copyShareUrl(nodes: Node[], edges: Edge[]): Promise<{ url: string }> {
    const url = buildShareUrl(nodes, edges)
    try {
        await navigator.clipboard.writeText(url)
    } catch {
        // Fallback for environments without clipboard API
        const ta = document.createElement('textarea')
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
    }
    return { url }
}

// ─── Check URL hash for embedded circuit (call on app start) ─────────────────
export function loadFromUrlHash(): { nodes: Node[]; edges: Edge[] } | null {
    try {
        const hash = window.location.hash
        if (!hash.startsWith(HASH_PREFIX)) return null
        const encoded = hash.slice(HASH_PREFIX.length)
        if (!encoded) return null
        return decodeCircuit(encoded)
    } catch {
        return null
    }
}

// ─── Clear the hash from URL without page reload ──────────────────────────────
export function clearUrlHash(): void {
    try {
        history.replaceState(null, '', window.location.pathname + window.location.search)
    } catch { /* ignore */ }
}
