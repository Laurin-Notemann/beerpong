import type { RackCup } from '~/lib/liveMatch';

/**
 * A team's cups as they're drawn on the table (re-racked, or the pyramid), apex towards the
 * middle of the screen: the blue team's rack on the left points right, the red team's on the
 * right points left. Cups that are gone stay as faint rings, so you see where they were hit.
 */
export function CupRack({
    cups,
    team,
    className,
}: {
    cups: RackCup[];
    team: 'blue' | 'red';
    className?: string;
}) {
    // the app's cup grid is 7x7; rows run from the base (y 0) to the apex (y 6)
    const size = 7;
    const color = team === 'blue' ? 'var(--color-blue)' : 'var(--color-red)';

    return (
        // cups sit on the grid (0 to 6), one cell around for their radius
        <svg viewBox={`-1 -1 ${size + 1} ${size + 1}`} className={className} aria-hidden>
            {cups.map(({ at, up }) => (
                <circle
                    key={`${at.x}:${at.y}`}
                    cx={team === 'blue' ? at.y : size - 1 - at.y}
                    cy={at.x}
                    r={0.92}
                    fill={up ? color : 'transparent'}
                    stroke={up ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}
                    strokeWidth={0.1}
                    style={{ transition: 'fill 300ms ease-out' }}
                />
            ))}
        </svg>
    );
}
