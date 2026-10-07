import type { LiveMatchDto } from '@/lib/liveMatch/types';
import type { OutboxEntry } from '@/zustand/liveMatchOutboxStore';

export interface GroupLiveMatchSource {
    id: string;
    /** what the server has, unless the match was only started on this phone so far */
    server?: LiveMatchDto;
    entry?: OutboxEntry;
    /** started on this phone and not on the server yet, so nobody else sees it */
    isPendingCreate: boolean;
    /** last activity the server reported, or the start; for sorting */
    activityAt: string;
}

/**
 * A group's live matches as the dock and the live matches sheet list them: the server's
 * matches in progress plus the ones this phone started that the server doesn't have yet,
 * most recently active first. Matches discarded on this phone are left out.
 */
export function groupLiveMatches(
    groupId: string,
    serverList: LiveMatchDto[],
    entries: Record<string, OutboxEntry>
): GroupLiveMatchSource[] {
    const fromServer = serverList
        .filter((i) => i.id && !entries[i.id]?.pendingAbandon)
        .map((i) => ({
            id: i.id,
            server: i,
            entry: entries[i.id],
            isPendingCreate: false,
            activityAt: i.lastActivityAt || i.startedAt || '',
        }));
    const known = new Set(fromServer.map((i) => i.id));

    const pending = Object.entries(entries)
        .filter(
            ([id, entry]) =>
                entry.groupId === groupId &&
                entry.pendingCreate &&
                !entry.pendingAbandon &&
                !known.has(id)
        )
        .map(([id, entry]) => ({
            id,
            entry,
            isPendingCreate: true,
            activityAt: entry.createdAt,
        }));

    // ISO timestamps sort as strings; ties by id so the order never flickers
    return [...fromServer, ...pending].sort(
        (a, b) =>
            b.activityAt.localeCompare(a.activityAt) || a.id.localeCompare(b.id)
    );
}

/**
 * the match the dock shows: the one opened or picked in the live matches sheet last on this
 * phone while it's live, else the latest
 */
export const primaryLiveMatch = <T extends { id: string }>(
    matches: T[],
    lastOpenedId: string | undefined
) => matches.find((i) => i.id === lastOpenedId) ?? matches[0];

/** what VoiceOver/TalkBack read for the dock (what tapping does is its hint) */
export function dockLabel({
    count,
    blueScore,
    redScore,
}: {
    count: number;
    blueScore: number;
    redScore: number;
}) {
    const score = `blue ${blueScore}, red ${redScore}`;

    return count > 1
        ? `${count} live matches, this one ${score}`
        : `Live match, ${score}`;
}

// Rough widths in the dock's row (see `DockRow`), to decide what fits before laying it out
const DOCK_CHROME = 56; // the dock's margins and padding
const DOCK_FIXED = 150; // live dot and timer, the two scores, the gaps between them
const MORE_CHIP = 38;
const AVATAR = 20;
const AVATAR_STEP = 10; // the avatars overlap by half
const NAMES_GAP = 6;
const MIN_NAMES_WIDTH = 40;
// names only fit next to small teams; bigger ones show their avatars
const MAX_NAMED_TEAM = 2;
/** at this window width and below, a badge shows 2 avatars and "+N" instead of 3 */
export const NARROW_DOCK_WIDTH = 340;

/** how the dock's two team badges fit next to the scores at this window width */
export function dockBadgeLayout({
    windowWidth,
    largestTeam,
    count,
}: {
    windowWidth: number;
    largestTeam: number;
    /** live matches in the group; more than one adds "+N" */
    count: number;
}) {
    const maxAvatars = windowWidth <= NARROW_DOCK_WIDTH ? 2 : 3;

    const badgeWidth =
        (windowWidth - DOCK_CHROME - DOCK_FIXED - (count > 1 ? MORE_CHIP : 0)) /
        2;
    const circles =
        Math.min(largestTeam, maxAvatars) + (largestTeam > maxAvatars ? 1 : 0);
    const avatarsWidth = AVATAR + AVATAR_STEP * Math.max(0, circles - 1);
    const showNames =
        largestTeam <= MAX_NAMED_TEAM &&
        badgeWidth - avatarsWidth - NAMES_GAP >= MIN_NAMES_WIDTH;

    return { maxAvatars, showNames };
}
