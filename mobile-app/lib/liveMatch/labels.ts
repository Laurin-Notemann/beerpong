import type { LiveMatchSyncStatus } from '@/api/liveMatch/useLiveMatch';

/** a team in one short line: "Anna", "Anna & Ben", "Anna, Ben +3" */
export function teamNames(names: string[]) {
    if (names.length <= 1) return names[0] ?? '';
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

/** why a live match can't be finished yet, or nothing when it can */
export function finishHint(finishes: number) {
    if (finishes === 0) return 'Enter the finish to end the match';
    if (finishes > 1) return 'Only one finish can count. Remove the extra one';
    return undefined;
}

export function syncLabel(status: LiveMatchSyncStatus, pendingCount: number) {
    if (status === 'synced') return 'Saved';
    if (status === 'syncing') return 'Saving…';
    return pendingCount > 0 ? `Offline · ${pendingCount} waiting` : 'Offline';
}
