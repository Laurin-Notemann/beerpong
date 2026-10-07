import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { uuid } from 'expo';
import { useEffect, useMemo } from 'react';

import {
    fetchLiveMatch,
    finishLiveMatch,
    useLiveMatchQuery,
} from '@/api/calls/liveMatchHooks';
import {
    applyLiveMatchEnd,
    cachedList,
    cachedMatch,
    invalidateLiveMatch,
    liveMatchKey,
    removeEndedFromList,
} from '@/api/liveMatch/liveMatchCache';
import { requestLiveMatchSync } from '@/api/liveMatch/useLiveMatchSync';
import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK, useQueryInvalidation } from '@/api/utils/reactQuery';
import { CupHit, CupPosition, CupTeam } from '@/lib/cupHits';
import { isEnded, mergeLiveMatch } from '@/lib/liveMatch/cache';
import { finishWithRetry, LiveMatchOfflineError } from '@/lib/liveMatch/finish';
import {
    composeOps,
    countFinishes,
    mergeOps,
    splitDelta,
    toTeamCreateDtos,
} from '@/lib/liveMatch/log';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import { LiveMatchDto, LiveOp, toLiveOps } from '@/lib/liveMatch/types';
import type { Rerack } from '@/lib/rerack';
import { showErrorToast } from '@/toast';
import { ScopedLogger } from '@/utils/logging';
import {
    liveMatchOutbox,
    OutboxEntry,
    useLiveMatchOutboxStore,
} from '@/zustand/liveMatchOutboxStore';

const logger = new ScopedLogger('live-match');

export type LiveMatchSyncStatus = 'synced' | 'syncing' | 'offline';

export interface LiveMatchHeader {
    id: string;
    groupId: string;
    seasonId: string;
    status: NonNullable<LiveMatchDto['status']>;
    startedAt: string;
    lastActivityAt?: string;
    endedAt?: string | null;
    createdByUserId?: string | null;
    /** the `Match` a finished live match became */
    resultMatchId?: string | null;
    /** not on the server yet: started offline, or the create is still on its way */
    isPendingCreate: boolean;
    tournamentId?: string;
    tournamentStage?: string;
}

/** what this phone shows: the server's log with my unconfirmed edits on top */
export function toView(
    groupId: string,
    id: string,
    server: LiveMatchDto | undefined,
    entry: OutboxEntry | undefined
) {
    const confirmed = mergeOps([], toLiveOps(server?.ops));
    // an ended match takes no more edits; whatever is still queued gets dropped
    const pending =
        entry && !isEnded(server)
            ? [...(entry.pendingCreate?.ops ?? []), ...entry.pendingOps]
            : [];
    const { state, ignoredOpIds } = reduceLiveMatch(
        composeOps(confirmed, pending)
    );

    const header: LiveMatchHeader | undefined =
        server || entry
            ? {
                  id,
                  groupId,
                  seasonId: server?.seasonId ?? entry?.seasonId ?? '',
                  // discarded here, the server just doesn't know yet
                  status: entry?.pendingAbandon
                      ? 'ABANDONED'
                      : (server?.status ?? 'IN_PROGRESS'),
                  startedAt: server?.startedAt ?? entry?.createdAt ?? '',
                  lastActivityAt: server?.lastActivityAt,
                  endedAt: server?.endedAt,
                  createdByUserId: server?.createdByUserId,
                  resultMatchId: server?.resultMatchId,
                  isPendingCreate: !!entry?.pendingCreate,
                  tournamentId: server?.tournamentId ?? entry?.tournamentId,
                  tournamentStage:
                      server?.tournamentStage ?? entry?.tournamentStage,
              }
            : undefined;

    return { header, confirmed, state, ignoredOpIds };
}

// one toast per conflict, however many screens show the match
const toastedConflicts = new Set<string>();

export function useLiveMatch(groupId: ApiId, id: ApiId) {
    const entry = useLiveMatchOutboxStore((s) => s.entries[id]);
    const failing = useLiveMatchOutboxStore((s) => !!s.failing[id]);
    const myOpIds = useLiveMatchOutboxStore((s) => s.myOpIds);

    // a match that isn't on the server yet would only 404
    const query = useLiveMatchQuery(groupId, id, {
        enabled: !entry?.pendingCreate,
    });

    const view = useMemo(
        () => toView(groupId, id, query.data ?? undefined, entry),
        [groupId, id, query.data, entry]
    );

    const ignoredOwnOpIds = useMemo(() => {
        const mine = new Set(myOpIds);
        return view.ignoredOpIds.filter((i) => mine.has(i));
    }, [view.ignoredOpIds, myOpIds]);

    // a conflict is only final once the server's log decided it. Only a lost cup hit is worth a
    // toast; another phone undoing the same cup or removing a player first needs no explanation
    useEffect(() => {
        const confirmed = new Map(view.confirmed.map((i) => [i.id, i]));
        const lost = ignoredOwnOpIds.filter(
            (i) => confirmed.has(i) && !toastedConflicts.has(i)
        );
        if (!lost.length) return;

        lost.forEach((i) => toastedConflicts.add(i));
        if (lost.some((i) => confirmed.get(i)?.type === 'RECORD_CUP_HIT')) {
            showErrorToast('Someone else already marked that cup.');
        }
    }, [ignoredOwnOpIds, view.confirmed]);

    const pendingCount = entry
        ? (entry.pendingCreate?.ops.length ?? 0) + entry.pendingOps.length
        : 0;
    const syncStatus: LiveMatchSyncStatus = !entry
        ? 'synced'
        : failing
          ? 'offline'
          : 'syncing';

    return {
        liveMatch: view.header,
        state: view.state,
        ignoredOwnOpIds,
        syncStatus,
        pendingCount,
        isLoading: !entry && query.isLoading,
        /** why the match couldn't be loaded, e.g. `liveMatchNotFound` (see `errorCode`) */
        error: query.error,
    };
}

const newOpId = () => uuid.v4();

/**
 * Queues a new live match with its teams and returns its id, without waiting for the network.
 * Nothing goes into the server caches until the server has it (see `useLiveMatchSync`).
 */
export function startLiveMatch(match: {
    id?: ApiId;
    tournamentId?: string;
    tournamentStage?: string;
    groupId: ApiId;
    seasonId: ApiId;
    redPlayerIds: string[];
    bluePlayerIds: string[];
}) {
    const id = match.id ?? newOpId();
    if (liveMatchOutbox().entries[id]) return id;

    liveMatchOutbox().actions.start(
        id,
        {
            groupId: match.groupId,
            seasonId: match.seasonId,
            createdAt: new Date().toISOString(),
            tournamentId: match.tournamentId,
            tournamentStage: match.tournamentStage,
        },
        [
            {
                id: newOpId(),
                type: 'SET_TEAMS',
                redPlayerIds: match.redPlayerIds,
                bluePlayerIds: match.bluePlayerIds,
            },
        ]
    );
    return id;
}

const readView = (qc: QueryClient, groupId: ApiId, id: ApiId) =>
    toView(
        groupId,
        id,
        cachedMatch(qc, groupId, id) ??
            cachedList(qc, groupId).find((i) => i.id === id),
        liveMatchOutbox().entries[id]
    );

/** resolves once the server has everything this phone queued for the match */
function waitUntilSent(id: ApiId, timeoutMs: number) {
    const isSent = () => !liveMatchOutbox().entries[id];

    return new Promise<void>((resolve, reject) => {
        if (isSent()) {
            resolve();
            return;
        }
        const unsubscribe = useLiveMatchOutboxStore.subscribe(() => {
            if (!isSent()) return;
            clearTimeout(timer);
            unsubscribe();
            resolve();
        });
        const timer = setTimeout(() => {
            unsubscribe();
            reject(new LiveMatchOfflineError());
        }, timeoutMs);
    });
}

/** the season's finish moves, if the rules have been loaded */
function cachedFinishMoveIds(qc: QueryClient, groupId: ApiId, seasonId: ApiId) {
    const res = qc.getQueryData<{ data?: unknown }>([
        QK.group,
        groupId,
        QK.season,
        seasonId,
        QK.ruleMoves,
    ]);
    if (!Array.isArray(res?.data)) return;

    return new Set(
        (res.data as { id?: string; finishingMove?: boolean }[])
            .filter((i) => i.finishingMove && i.id)
            .map((i) => i.id!)
    );
}

export function useLiveMatchActions(groupId: ApiId, id: ApiId) {
    const qc = useQueryClient();
    const { api } = useApi();
    const { invalidateMatches, invalidatePlayers, invalidateLeaderboard } =
        useQueryInvalidation();

    /** every edit is applied locally right away and sent in the background */
    function enqueue(ops: LiveOp[]) {
        const { header } = readView(qc, groupId, id);
        if (!header || header.status !== 'IN_PROGRESS') {
            logger.warn('ignoring an edit to a live match not in progress', id);
            return;
        }
        liveMatchOutbox().actions.enqueue(
            id,
            {
                groupId,
                seasonId: header.seasonId,
                createdAt: new Date().toISOString(),
                tournamentId: header.tournamentId,
                tournamentStage: header.tournamentStage,
            },
            ops
        );
    }

    function setPlayerTeam(playerId: string, team: CupTeam | null) {
        enqueue([{ id: newOpId(), type: 'SET_PLAYER_TEAM', playerId, team }]);
    }

    /** sent as the difference to what this phone shows, so taps on two phones add up */
    function setMoveCount(playerId: string, moveId: string, count: number) {
        const { state } = readView(qc, groupId, id);
        const current =
            [...state.redTeam.teamMembers, ...state.blueTeam.teamMembers]
                .find((i) => i.playerId === playerId)
                ?.moves.find((i) => i.moveId === moveId)?.count ?? 0;

        const deltas = splitDelta(Math.max(0, count) - current);
        if (!deltas.length) return;

        enqueue(
            deltas.map((delta) => ({
                id: newOpId(),
                type: 'ADJUST_MOVE',
                playerId,
                moveId,
                delta,
            }))
        );
    }

    function recordCupHit(hit: CupHit) {
        enqueue([
            {
                id: newOpId(),
                type: 'RECORD_CUP_HIT',
                team: hit.team,
                playerId: hit.playerId,
                moveId: hit.moveId,
                cups: hit.cups,
                finishMoveId: hit.finishMoveId,
            },
        ]);
    }

    function undoCupHit(team: CupTeam, cup: CupPosition) {
        enqueue([{ id: newOpId(), type: 'UNDO_CUP_HIT', team, cup }]);
    }

    /** shows the team's cups in another formation on every phone and the TV; none: the pyramid */
    function setRerack(team: CupTeam, rerack?: Rerack) {
        enqueue([
            {
                id: newOpId(),
                type: 'SET_RERACK',
                team,
                cups: rerack?.slots.map((i) => i.cup) ?? [],
                drawn: rerack?.slots.map((i) => i.drawn) ?? [],
                formationId: rerack?.formationId || undefined,
            },
        ]);
    }

    function recordMiss(playerId: string) {
        enqueue([{ id: newOpId(), type: 'RECORD_MISS', playerId }]);
    }

    function undoMiss(playerId: string) {
        enqueue([{ id: newOpId(), type: 'UNDO_MISS', playerId }]);
    }

    async function refetch(): Promise<LiveMatchDto> {
        const fetched = await fetchLiveMatch(await api, groupId, id);
        const merged = mergeLiveMatch(cachedMatch(qc, groupId, id), fetched);
        qc.setQueryData(liveMatchKey(groupId, id), merged);
        removeEndedFromList(qc, groupId, merged);
        return merged;
    }

    /**
     * Turns the live match into a `Match`. Waits (up to 10 s) for this phone's edits to reach
     * the server first. If someone edits the match meanwhile, it retries once with their edits,
     * as long as the match still has exactly one finish.
     */
    async function finish() {
        requestLiveMatchSync();
        await waitUntilSent(id, 10_000);

        const client = await api;
        const result = await finishWithRetry({
            cached: cachedMatch(qc, groupId, id),
            refetch,
            send: (server) =>
                finishLiveMatch(client, groupId, id, {
                    expectedSeq: server.lastSeq ?? 0,
                    teams: toTeamCreateDtos(
                        toView(groupId, id, server, undefined).state
                    ),
                }),
            countFinishes: (server) => {
                const finishMoveIds = cachedFinishMoveIds(
                    qc,
                    groupId,
                    server.seasonId ?? ''
                );
                return (
                    finishMoveIds &&
                    countFinishes(
                        toView(groupId, id, server, undefined).state,
                        finishMoveIds
                    )
                );
            },
            onEnded: () => invalidateLiveMatch(qc, groupId, id),
        });

        const seasonId =
            result.seasonId ?? readView(qc, groupId, id).header?.seasonId;
        if (!result.resultMatchId || !seasonId) {
            throw new Error('finishLiveMatch: no result match');
        }
        applyLiveMatchEnd(qc, groupId, result);
        void invalidateMatches(groupId, seasonId);
        void invalidatePlayers(groupId, seasonId);
        void invalidateLeaderboard(groupId);

        return { matchId: result.resultMatchId, seasonId };
    }

    /**
     * Ends the match without a result, for everyone. Takes effect on this phone right away; the
     * server gets it through the outbox, so it survives being offline and app kills.
     */
    function discard() {
        const { header } = readView(qc, groupId, id);
        if (!header) return;

        liveMatchOutbox().actions.abandon(id, {
            groupId,
            seasonId: header.seasonId,
            createdAt: new Date().toISOString(),
            tournamentId: header.tournamentId,
            tournamentStage: header.tournamentStage,
        });
    }

    return {
        setPlayerTeam,
        setMoveCount,
        recordCupHit,
        undoCupHit,
        setRerack,
        recordMiss,
        undoMiss,
        finish,
        discard,
    };
}
