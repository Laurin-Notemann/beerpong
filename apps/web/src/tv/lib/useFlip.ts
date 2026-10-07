import { useLayoutEffect, useRef } from 'react';

/**
 * Slides the children of `ref` with a `data-flip` id from where they were to where they are
 * now whenever `order` changes, so leaderboard rows move to their new rank instead of jumping.
 */
export function useFlip<T extends HTMLElement>(order: string) {
    const ref = useRef<T>(null);
    const last = useRef(new Map<string, number>());

    useLayoutEffect(() => {
        const items = [...(ref.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])];
        const now = new Map(items.map((el) => [el.dataset.flip!, el.getBoundingClientRect().top]));

        for (const el of items) {
            const before = last.current.get(el.dataset.flip!);
            const delta = before === undefined ? 0 : before - now.get(el.dataset.flip!)!;
            if (!delta) continue;
            el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
                duration: 700,
                easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            });
        }
        last.current = now;
    }, [order]);

    return ref;
}
