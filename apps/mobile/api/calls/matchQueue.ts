import { Mutation, QueryClient, useMutationState } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { ApiId } from '@/api/types';
import { QK } from '@/api/utils/reactQuery';
import { Components, Paths } from '@/openapi/openapi';

/**
 * Entering a match never waits for the network. A new match is a React Query mutation that
 * pauses while the phone is offline: it shows in the match list right away
 * (`withQueuedMatches`), is persisted with the query cache, and is sent when the phone is back
 * online, also after the app was killed (`resumeQueuedMatches`). The match id comes from the
 * phone, and the API returns the stored match for an id it already has, so a create that is
 * sent twice saves the match once.
 */
export const createMatchKey = ['createMatch'];

export interface QueuedMatch {
    id: ApiId;
    groupId: ApiId;
    seasonId: ApiId;
    teams: Components.Schemas.TeamCreateDto[];
    /** when it was entered; the list shows it there until the server's match arrives */
    enteredAt: string;
    /** team photos to upload once the server has the match */
    photos?: { blueTeamPhotoUri: string; redTeamPhotoUri: string };
}

type MatchDtoExtended = Components.Schemas.MatchDtoExtended;
export type CreatedMatch = Paths.CreateMatch.Responses.$200 | null;

/**
 * Sending again is safe (see `createMatchKey`), so a request that got no answer (timeout, a
 * connection that dropped) is retried until it gets one, and a server error a few times. An
 * answer from the server that it won't take the match is final.
 */
export function shouldRetryCreateMatch(failureCount: number, error: unknown) {
    if (!isAxiosError(error)) return false;
    const status = error.response?.status;
    if (status === undefined) return true;
    return status >= 500 && failureCount < 5;
}

export const createMatchRetryDelay = (failureCount: number) =>
    Math.min(1000 * 2 ** failureCount, 30_000);

const dtos = new WeakMap<QueuedMatch, MatchDtoExtended>();

/** The queued match as the server would list it, so it converts like any other. */
export function queuedMatchDto(match: QueuedMatch): MatchDtoExtended {
    const cached = dtos.get(match);
    if (cached) return cached;

    const dto: MatchDtoExtended = {
        id: match.id,
        date: match.enteredAt,
        seasonId: match.seasonId,
        createdById: null,
        photoUploads: null,
        teams: [],
        teamMembers: [],
        matchMoves: [],
    };
    // blue first, then red, like the server's teams
    match.teams.forEach((team, t) => {
        const teamId = `${match.id}-team-${t}`;
        dto.teams.push({ id: teamId, matchId: match.id, photoAssetId: null });
        team.teamMembers?.forEach((member, m) => {
            const memberId = `${teamId}-${m}`;
            dto.teamMembers.push({
                id: memberId,
                teamId,
                playerId: member.playerId ?? null,
            });
            member.moves?.forEach((move, k) => {
                dto.matchMoves.push({
                    id: `${memberId}-${k}`,
                    value: move.count ?? 0,
                    teamMemberId: memberId,
                    moveId: move.moveId,
                });
            });
        });
    });
    dtos.set(match, dto);
    return dto;
}

/**
 * The season's matches with its queued ones that the server doesn't list yet, and the ids of
 * those (shown as not synced). A match is listed once, also if it was queued twice or the
 * server already has it.
 */
export function withQueuedMatches(
    serverMatches: MatchDtoExtended[],
    queued: (QueuedMatch | undefined)[],
    seasonId: ApiId
) {
    const listed = new Set(serverMatches.map((i) => i.id));
    const missing: QueuedMatch[] = [];
    for (const match of queued) {
        if (!match || match.seasonId !== seasonId || listed.has(match.id)) {
            continue;
        }
        listed.add(match.id);
        missing.push(match);
    }
    if (!missing.length) {
        return { matches: serverMatches, queuedIds: new Set<string>() };
    }
    return {
        matches: [...serverMatches, ...missing.map(queuedMatchDto)],
        queuedIds: new Set(missing.map((i) => i.id)),
    };
}

/**
 * The defaults every create match mutation runs with, also the ones restored from disk after
 * a restart, which have no `useMutation` options. They must be registered before the cache
 * restores.
 */
export function registerMatchQueue(
    qc: QueryClient,
    deps: {
        createMatch: (match: QueuedMatch) => Promise<CreatedMatch>;
        onCreated: (match: QueuedMatch, created: CreatedMatch) => void;
        onRejected: (match: QueuedMatch, error: unknown) => void;
    }
) {
    qc.setMutationDefaults<CreatedMatch, unknown, QueuedMatch>(createMatchKey, {
        mutationFn: deps.createMatch,
        // waits (paused) while offline instead of failing
        networkMode: 'online',
        retry: shouldRetryCreateMatch,
        retryDelay: createMatchRetryDelay,
        // one at a time, in the order they were entered: the Elo replays matches in that order
        scope: { id: 'createMatch' },
        onSuccess: async (created, match) => {
            deps.onCreated(match, created);
            // The match stays listed as queued until the group's data (matches, leaderboards,
            // players) has refetched with it, so it doesn't drop out of the list in between.
            // The realtime event does the same on the other phones.
            await qc.invalidateQueries({ queryKey: [QK.group, match.groupId] });
        },
        onError: (error, match) => deps.onRejected(match, error),
    });
}

export const isCreateMatch = (mutation: Pick<Mutation, 'options'>) =>
    mutation.options.mutationKey?.[0] === createMatchKey[0];

/**
 * What the cache persister keeps of the mutation cache: paused mutations (React Query's
 * default), and queued matches still in flight, whose answer the app may never see if it's
 * killed now.
 */
export const shouldPersistMutation = (mutation: Mutation) =>
    mutation.state.isPaused ||
    (mutation.state.status === 'pending' && isCreateMatch(mutation));

const queuedMutations = (qc: QueryClient) =>
    qc
        .getMutationCache()
        .findAll({ mutationKey: createMatchKey, status: 'pending' });

/**
 * After the persisted cache was restored: sends the queued matches again, paused or not (a
 * restored mutation that was in flight is pending, but not paused, so
 * `resumePausedMutations` would skip it). Offline, they pause again.
 */
export function resumeQueuedMatches(qc: QueryClient) {
    return Promise.all(
        queuedMutations(qc).map((i) => i.continue().catch(() => undefined))
    );
}

/**
 * Drops a queued match that hasn't been sent: true if it was waiting, false if it's being
 * sent right now (it may already be saved then).
 */
export function discardQueuedMatch(qc: QueryClient, matchId: ApiId) {
    const mutations = queuedMutations(qc).filter(
        (i) => (i.state.variables as QueuedMatch | undefined)?.id === matchId
    );
    if (!mutations.length || mutations.some((i) => !i.state.isPaused)) {
        return false;
    }
    mutations.forEach((i) => qc.getMutationCache().remove(i));
    return true;
}

/** The matches of the group that this phone hasn't sent yet, oldest first. */
export function useQueuedMatches(groupId: ApiId | null) {
    return useMutationState({
        filters: { mutationKey: createMatchKey, status: 'pending' },
        select: (mutation) => {
            const match = mutation.state.variables as QueuedMatch | undefined;
            return match?.groupId === groupId ? match : undefined;
        },
    });
}
