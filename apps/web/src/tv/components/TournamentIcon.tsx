import { TOURNAMENT_COLOR } from '@/lib/tournament';

/** The same bracket silhouette as MaterialCommunityIcons' tournament icon on phones. */
export function TournamentIcon({ size = 28 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: TOURNAMENT_COLOR, flexShrink: 0 }}
            aria-label="Tournament"
        >
            <path d="M1 2H7V4H5V7H11V10H13V7H19V4H17V2H23V4H21V9H15V15H21V20H23V22H17V20H19V17H13V14H11V17H5V20H7V22H1V20H3V15H9V9H3V4H1V2Z" />
        </svg>
    );
}
