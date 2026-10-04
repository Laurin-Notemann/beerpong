import { describe, expect, it } from 'vitest';

import {
    dockBadgeLayout,
    dockLabel,
    groupLiveMatches,
    primaryLiveMatch,
} from '@/lib/liveMatch/dock';
import type { LiveMatchDto } from '@/lib/liveMatch/types';
import type { OutboxEntry } from '@/zustand/liveMatchOutboxStore';

const server = (
    id: string,
    lastActivityAt: string,
    extra: Partial<LiveMatchDto> = {}
): LiveMatchDto => ({
    id,
    status: 'IN_PROGRESS',
    startedAt: '2026-10-04T18:00:00Z',
    lastActivityAt,
    ...extra,
});

const pendingCreate = (
    groupId: string,
    createdAt: string,
    extra: Partial<OutboxEntry> = {}
): OutboxEntry => ({
    groupId,
    seasonId: 's1',
    createdAt,
    pendingCreate: { ops: [] },
    pendingOps: [],
    ...extra,
});

describe('groupLiveMatches', () => {
    it('lists the server matches, most recently active first', () => {
        const list = groupLiveMatches(
            'g1',
            [
                server('a', '2026-10-04T18:05:00Z'),
                server('b', '2026-10-04T18:20:00Z'),
                server('c', '2026-10-04T18:10:00Z'),
            ],
            {}
        );
        expect(list.map((i) => i.id)).toEqual(['b', 'c', 'a']);
    });

    it('falls back to the start time when the server sent no activity', () => {
        const list = groupLiveMatches(
            'g1',
            [
                server('a', '2026-10-04T18:05:00Z'),
                server('b', '', {
                    lastActivityAt: undefined,
                    startedAt: '2026-10-04T18:30:00Z',
                }),
            ],
            {}
        );
        expect(list.map((i) => i.id)).toEqual(['b', 'a']);
    });

    it("adds this group's matches the server doesn't have yet", () => {
        const list = groupLiveMatches(
            'g1',
            [server('a', '2026-10-04T18:05:00Z')],
            {
                p: pendingCreate('g1', '2026-10-04T18:40:00Z'),
                other: pendingCreate('g2', '2026-10-04T18:50:00Z'),
            }
        );
        expect(list.map((i) => [i.id, i.isPendingCreate])).toEqual([
            ['p', true],
            ['a', false],
        ]);
    });

    it("doesn't list a match twice once the server has it", () => {
        const list = groupLiveMatches(
            'g1',
            [server('p', '2026-10-04T18:05:00Z')],
            { p: pendingCreate('g1', '2026-10-04T18:00:00Z') }
        );
        expect(list.map((i) => [i.id, i.isPendingCreate])).toEqual([
            ['p', false],
        ]);
        expect(list[0].entry).toBeDefined();
    });

    it('leaves out matches discarded on this phone', () => {
        const list = groupLiveMatches(
            'g1',
            [server('a', '2026-10-04T18:05:00Z')],
            {
                a: {
                    ...pendingCreate('g1', '2026-10-04T18:00:00Z'),
                    pendingCreate: undefined,
                    pendingAbandon: true,
                },
                b: pendingCreate('g1', '2026-10-04T18:00:00Z', {
                    pendingAbandon: true,
                }),
            }
        );
        expect(list).toEqual([]);
    });

    it('ignores outbox entries that only hold edits', () => {
        const list = groupLiveMatches('g1', [], {
            e: pendingCreate('g1', '2026-10-04T18:00:00Z', {
                pendingCreate: undefined,
            }),
        });
        expect(list).toEqual([]);
    });
});

describe('primaryLiveMatch', () => {
    const list = [{ id: 'b' }, { id: 'a' }];

    it('is the one opened last on this phone while it is live', () => {
        expect(primaryLiveMatch(list, 'a')?.id).toBe('a');
    });

    it('is the most recently active one otherwise', () => {
        expect(primaryLiveMatch(list, 'gone')?.id).toBe('b');
        expect(primaryLiveMatch(list, undefined)?.id).toBe('b');
    });

    it('is nothing without live matches', () => {
        expect(primaryLiveMatch([], 'a')).toBeUndefined();
    });
});

describe('dockLabel', () => {
    it('reads one match with its score', () => {
        expect(dockLabel({ count: 1, blueScore: 4, redScore: 6 })).toBe(
            'Live match, blue 4, red 6. Opens the match'
        );
    });

    it('mentions the others when several are live', () => {
        expect(dockLabel({ count: 3, blueScore: 0, redScore: 1 })).toBe(
            '3 live matches, this one blue 0, red 1. Opens the list'
        );
    });
});

describe('dockBadgeLayout', () => {
    it('shows three avatars and the names of small teams on regular phones', () => {
        expect(
            dockBadgeLayout({ windowWidth: 393, largestTeam: 2, count: 1 })
        ).toEqual({ maxAvatars: 3, showNames: true });
    });

    it('caps the avatars at two plus "+N" on narrow phones', () => {
        expect(
            dockBadgeLayout({ windowWidth: 320, largestTeam: 4, count: 1 })
                .maxAvatars
        ).toBe(2);
        expect(
            dockBadgeLayout({ windowWidth: 375, largestTeam: 4, count: 1 })
                .maxAvatars
        ).toBe(3);
    });

    it('hides names that would get too little room', () => {
        // 1v1 on a 320 pt phone leaves about 30 pt per name
        expect(
            dockBadgeLayout({ windowWidth: 320, largestTeam: 1, count: 1 })
                .showNames
        ).toBe(false);
        // "+N" takes the room the names had
        expect(
            dockBadgeLayout({ windowWidth: 375, largestTeam: 2, count: 2 })
                .showNames
        ).toBe(false);
        expect(
            dockBadgeLayout({ windowWidth: 375, largestTeam: 2, count: 1 })
                .showNames
        ).toBe(true);
    });

    it('never names teams of three or more', () => {
        expect(
            dockBadgeLayout({ windowWidth: 430, largestTeam: 3, count: 1 })
                .showNames
        ).toBe(false);
    });
});
