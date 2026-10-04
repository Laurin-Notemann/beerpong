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
            id: i.id!,
            server: i,
            entry: entries[i.id!],
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

/** the match the dock shows: the one opened last on this phone while it's live, else the latest */
export const primaryLiveMatch = <T extends { id: string }>(
    matches: T[],
    lastOpenedId: string | undefined
) => matches.find((i) => i.id === lastOpenedId) ?? matches[0];

/** what VoiceOver/TalkBack read for the dock */
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
        ? `${count} live matches, this one ${score}. Opens the list`
        : `Live match, ${score}. Opens the match`;
}
