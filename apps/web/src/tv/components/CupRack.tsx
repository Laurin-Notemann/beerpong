import type { RackCup } from '~/tv/lib/liveMatch';

/**
 * A team's cups as they're drawn on the table (re-racked, or the pyramid), apex towards the
 * middle of the screen. Direction follows screen position independently of team color.
 * Cups that are gone stay as faint rings, so you see where they were hit.
 */
export function CupRack({
    cups,
    team,
    side = team === 'blue' ? 'left' : 'right',
    className,
    highlight,
}: {
    cups: RackCup[];
    team: 'blue' | 'red';
    side?: 'left' | 'right';
    className?: string;
    highlight?: { x: number; y: number } | null;
}) {
    // the app's cup grid is 7x7; rows run from the base (y 0) to the apex (y 6)
    const size = 7;
    const color = team === 'blue' ? 'var(--color-blue)' : 'var(--color-red)';

    return (
        // cups sit on the grid (0 to 6), one cell around for their radius
        <svg viewBox={`-1 -1 ${size + 1} ${size + 1}`} className={className} aria-hidden>
            {cups.map(({ at, up, original }) => (
                <circle
                    key={`${at.x}:${at.y}`}
                    cx={side === 'left' ? at.y : size - 1 - at.y}
                    cy={at.x}
                    r={0.92}
                    fill={up ? color : 'transparent'}
                    stroke={
                        up && original && original.x === highlight?.x && original.y === highlight?.y
                            ? '#ffe27a'
                            : up
                              ? 'rgba(255,255,255,0.35)'
                              : 'rgba(255,255,255,0.12)'
                    }
                    strokeWidth={
                        up && original && original.x === highlight?.x && original.y === highlight?.y
                            ? 0.3
                            : 0.1
                    }
                    style={{ transition: 'fill 300ms ease-out' }}
                />
            ))}
        </svg>
    );
}
