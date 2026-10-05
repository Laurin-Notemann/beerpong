import { CUP_FORMATION, type CupPosition } from '~/tv/lib/liveMatch';

/**
 * A team's ten cups as they stand on the table, apex towards the middle of the screen: the blue
 * team's rack on the left points right, the red team's on the right points left. Cups that are
 * gone stay as faint rings, so you see at a glance where they were hit.
 */
export function CupRack({
    standing,
    team,
    className,
}: {
    standing: CupPosition[];
    team: 'blue' | 'red';
    className?: string;
}) {
    const { rows, columns, cups } = CUP_FORMATION;
    const isStanding = (cup: CupPosition) => standing.some((i) => i.x === cup.x && i.y === cup.y);
    const color = team === 'blue' ? 'var(--color-blue)' : 'var(--color-red)';

    return (
        // cups sit on the formation's grid (0 to 6), one cell around for their radius
        <svg viewBox={`-1 -1 ${rows + 1} ${columns + 1}`} className={className} aria-hidden>
            {cups.map((cup) => {
                // the formation's rows run from the base (y 0) to the apex (y 6)
                const cx = team === 'blue' ? cup.y : rows - 1 - cup.y;
                const cy = cup.x;
                const up = isStanding(cup);
                return (
                    <circle
                        key={`${cup.x}:${cup.y}`}
                        cx={cx}
                        cy={cy}
                        r={0.92}
                        fill={up ? color : 'transparent'}
                        stroke={up ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}
                        strokeWidth={0.1}
                        style={{ transition: 'fill 300ms ease-out' }}
                    />
                );
            })}
        </svg>
    );
}
