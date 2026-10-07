import { useCallback, useEffect, useRef } from 'react';

export function useDebounce<Args extends unknown[]>(
    fn: (...args: Args) => void,
    delay: number
): (...args: Args) => void {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debounced = useCallback(
        (...args: Args) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                fn(...args);
            }, delay);
        },
        [fn, delay]
    );

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return debounced;
}
