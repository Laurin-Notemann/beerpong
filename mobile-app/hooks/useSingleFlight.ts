import { useRef, useState } from 'react';

/**
 * Wraps a submit handler so it runs once at a time; calls while it runs are ignored. Disabling
 * the button on a mutation's `isPending` alone lets a fast double tap through (it lands before
 * the re-render, and a native toolbar button updates later still), as do two buttons for the
 * same action. `isPending` covers the whole handler, not only the request.
 */
export function useSingleFlight<Args extends unknown[]>(
    fn: (...args: Args) => Promise<void>
) {
    const inFlight = useRef(false);
    const [isPending, setIsPending] = useState(false);

    async function run(...args: Args) {
        if (inFlight.current) return;
        inFlight.current = true;
        setIsPending(true);
        try {
            await fn(...args);
        } finally {
            inFlight.current = false;
            setIsPending(false);
        }
    }

    return [run, isPending] as const;
}
