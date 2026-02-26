import { useEffect, useRef } from 'react'
import { useCircuitStore } from '../store/circuitStore'

/**
 * Clock Engine — drives the simulation clock using setInterval.
 * Reads `clockRunning` and `clockFreq` from the store.
 * On each tick:
 *   1. Toggles all CLOCK-type nodes' outputValue
 *   2. Calls `_simulate()` to propagate signals
 *   3. Records timing data for all sequential nodes
 *
 * Must be mounted once, near the canvas root.
 */
export function useClockEngine() {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const unsubscribe = useCircuitStore.subscribe(
            (state) => ({ running: state.clockRunning, freq: state.clockFreq }),
            ({ running, freq }) => {
                // Clear existing
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }

                if (!running) return

                const intervalMs = Math.max(50, Math.round(1000 / freq))

                intervalRef.current = setInterval(() => {
                    useCircuitStore.getState().clockTick()
                }, intervalMs)
            },
            { equalityFn: (a, b) => a.running === b.running && a.freq === b.freq, fireImmediately: true }
        )

        return () => {
            unsubscribe()
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [])
}
