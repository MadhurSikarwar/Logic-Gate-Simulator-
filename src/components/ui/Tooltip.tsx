import { useRef, useState, useEffect, type ReactNode } from 'react'

interface TooltipProps {
    children: ReactNode
    label: string
    shortcut?: string
    delay?: number
}

export function Tooltip({ children, label, shortcut, delay = 500 }: TooltipProps) {
    const [visible, setVisible] = useState(false)
    const [pos, setPos] = useState({ x: 0, y: 0 })
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const ref = useRef<HTMLDivElement>(null)

    const show = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        timer.current = setTimeout(() => {
            setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 })
            setVisible(true)
        }, delay)
    }

    const hide = () => {
        if (timer.current) clearTimeout(timer.current)
        setVisible(false)
    }

    useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

    return (
        <div
            ref={ref}
            style={{ display: 'contents' }}
            onMouseEnter={show}
            onMouseLeave={hide}
            onMouseDown={hide}
        >
            {children}
            {visible && (
                <div
                    className="tooltip-box"
                    style={{
                        left: pos.x,
                        top: pos.y,
                        transform: 'translateX(-50%)',
                    }}
                >
                    {label}
                    {shortcut && (
                        <span className="tooltip-shortcut">
                            <kbd className="kbd">{shortcut}</kbd>
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
