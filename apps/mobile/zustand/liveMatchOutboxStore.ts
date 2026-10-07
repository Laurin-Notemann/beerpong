import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LiveOp } from '@/lib/liveMatch/types';

/**
 * The live match edits this phone made that the server hasn't confirmed yet. Persisted, so they
 * survive an app kill and a match started offline is fully usable before the server knows it.
 * `useLiveMatchSync` drains it.
 */

export interface OutboxEntry {
    tournamentId?: string;
    tournamentStage?: string;
    groupId: string;
    seasonId: string;
    /** when this phone first queued something for the match; the start time while pending create */
    createdAt: string;
    /** set until the server has the match (`PUT /live-matches/{id}`) */
    pendingCreate?: { ops: LiveOp[] };
    /** the create went out at least once, so the server may have the match even without an answer */
    createSent?: true;
    /** oldest first */
    pendingOps: LiveOp[];
    /** discarded on this phone; `DELETE /live-matches/{id}` still has to reach the server */
    pendingAbandon?: true;
}

export interface OutboxState {
    /** by live match id */
    entries: Record<string, OutboxEntry>;
    /** by group id: the live match this phone opened last */
    lastOpenedLiveMatchId: Record<string, string>;
    /** ids of ops created on this phone, newest last, to tell my conflicts apart from others' */
    myOpIds: string[];
    /** live match ids whose last sync attempt failed; not persisted */
    failing: Record<string, true>;
}

/** enough for every op of the matches anyone is plausibly still looking at */
export const MAX_MY_OP_IDS = 500;

const withoutKey = <T>(record: Record<string, T>, key: string) => {
    const { [key]: _removed, ...rest } = record;
    return rest;
};

const rememberMine = (state: OutboxState, ops: LiveOp[]) =>
    [...state.myOpIds, ...ops.map((i) => i.id)].slice(-MAX_MY_OP_IDS);

/** an entry with nothing left to send is removed */
const putEntry = (
    state: OutboxState,
    id: string,
    entry: OutboxEntry
): Pick<OutboxState, 'entries' | 'failing'> =>
    entry.pendingAbandon || entry.pendingCreate || entry.pendingOps.length
        ? { entries: { ...state.entries, [id]: entry }, failing: state.failing }
        : {
              entries: withoutKey(state.entries, id),
              failing: withoutKey(state.failing, id),
          };

/** The store's state transitions, pure so they can be tested without the store. */
export const outbox = {
    start(
        state: OutboxState,
        id: string,
        match: {
            groupId: string;
            seasonId: string;
            createdAt: string;
            tournamentId?: string;
            tournamentStage?: string;
        },
        ops: LiveOp[]
    ): Partial<OutboxState> {
        return {
            ...putEntry(state, id, {
                ...match,
                pendingCreate: { ops },
                pendingOps: [],
            }),
            myOpIds: rememberMine(state, ops),
        };
    },

    enqueue(
        state: OutboxState,
        id: string,
        match: {
            groupId: string;
            seasonId: string;
            createdAt: string;
            tournamentId?: string;
            tournamentStage?: string;
        },
        ops: LiveOp[]
    ): Partial<OutboxState> {
        // a discarded match takes no more edits
        if (state.entries[id]?.pendingAbandon) return {};
        const entry = state.entries[id] ?? { ...match, pendingOps: [] };

        return {
            ...putEntry(state, id, {
                ...entry,
                pendingOps: [...entry.pendingOps, ...ops],
            }),
            myOpIds: rememberMine(state, ops),
        };
    },

    markCreateSent(state: OutboxState, id: string): Partial<OutboxState> {
        const entry = state.entries[id];
        if (!entry?.pendingCreate || entry.createSent) return {};

        return putEntry(state, id, { ...entry, createSent: true });
    },

    /**
     * Discards the match. One the server can't know about yet is just forgotten; otherwise the
     * entry stays until the server has the discard, and nothing else is sent for it.
     */
    abandon(
        state: OutboxState,
        id: string,
        match: {
            groupId: string;
            seasonId: string;
            createdAt: string;
            tournamentId?: string;
            tournamentStage?: string;
        }
    ): Partial<OutboxState> {
        const entry = state.entries[id];
        if (entry?.pendingCreate && !entry.createSent) {
            return outbox.drop(state, id);
        }
        return putEntry(state, id, {
            ...(entry ?? match),
            pendingCreate: undefined,
            pendingOps: [],
            pendingAbandon: true,
        });
    },

    ackCreate(state: OutboxState, id: string): Partial<OutboxState> {
        const entry = state.entries[id];
        if (!entry?.pendingCreate) return {};

        return putEntry(state, id, { ...entry, pendingCreate: undefined });
    },

    /** removes the ops the server confirmed (or rejected for good) from the queue */
    ackOps(
        state: OutboxState,
        id: string,
        opIds: string[]
    ): Partial<OutboxState> {
        const entry = state.entries[id];
        if (!entry) return {};

        const acked = new Set(opIds);
        return putEntry(state, id, {
            ...entry,
            pendingOps: entry.pendingOps.filter((i) => !acked.has(i.id)),
        });
    },

    drop(state: OutboxState, id: string): Partial<OutboxState> {
        if (!state.entries[id] && !state.failing[id]) return {};

        return {
            entries: withoutKey(state.entries, id),
            failing: withoutKey(state.failing, id),
        };
    },

    /** the user left the group: the server refuses it now, so its queued edits can never be sent */
    dropGroup(state: OutboxState, groupId: string): Partial<OutboxState> {
        const gone = Object.keys(state.entries).filter(
            (id) => state.entries[id].groupId === groupId
        );
        if (!gone.length && !state.lastOpenedLiveMatchId[groupId]) return {};

        return {
            entries: Object.fromEntries(
                Object.entries(state.entries).filter(
                    ([id]) => !gone.includes(id)
                )
            ),
            failing: Object.fromEntries(
                Object.entries(state.failing).filter(
                    ([id]) => !gone.includes(id)
                )
            ),
            lastOpenedLiveMatchId: withoutKey(
                state.lastOpenedLiveMatchId,
                groupId
            ),
        };
    },

    setFailing(
        state: OutboxState,
        id: string,
        failing: boolean
    ): Partial<OutboxState> {
        if (!!state.failing[id] === failing) return {};
        if (failing && !state.entries[id]) return {};

        return {
            failing: failing
                ? { ...state.failing, [id]: true }
                : withoutKey(state.failing, id),
        };
    },

    setLastOpened(
        state: OutboxState,
        groupId: string,
        id: string
    ): Partial<OutboxState> {
        return {
            lastOpenedLiveMatchId: {
                ...state.lastOpenedLiveMatchId,
                [groupId]: id,
            },
        };
    },
};

const emptyOutbox: OutboxState = {
    entries: {},
    lastOpenedLiveMatchId: {},
    myOpIds: [],
    failing: {},
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/** What was persisted, minus anything that doesn't have the shape this version expects. */
export function restoreOutbox(persisted: unknown): Partial<OutboxState> {
    if (!isObject(persisted)) return {};

    const entries = Object.fromEntries(
        Object.entries(
            isObject(persisted.entries) ? persisted.entries : {}
        ).filter(
            ([, entry]) =>
                isObject(entry) &&
                typeof entry.groupId === 'string' &&
                typeof entry.seasonId === 'string' &&
                Array.isArray(entry.pendingOps) &&
                (entry.pendingCreate === undefined ||
                    (isObject(entry.pendingCreate) &&
                        Array.isArray(entry.pendingCreate.ops)))
        )
    ) as Record<string, OutboxEntry>;

    const lastOpened = isObject(persisted.lastOpenedLiveMatchId)
        ? Object.fromEntries(
              Object.entries(persisted.lastOpenedLiveMatchId).filter(
                  ([, id]) => typeof id === 'string'
              )
          )
        : {};

    const myOpIds = Array.isArray(persisted.myOpIds)
        ? persisted.myOpIds.filter((i): i is string => typeof i === 'string')
        : [];

    return {
        entries,
        lastOpenedLiveMatchId: lastOpened as Record<string, string>,
        myOpIds,
    };
}

/**
 * Combines the outbox read from disk with edits made before it was read (hydration is async):
 * per match, what was persisted comes first and the newer ops after it.
 */
export function mergeOutbox(
    persisted: Partial<OutboxState>,
    current: OutboxState
): OutboxState {
    const entries = { ...persisted.entries };

    for (const [id, newer] of Object.entries(current.entries)) {
        const older = entries[id];
        if (!older) {
            entries[id] = newer;
            continue;
        }
        if (older.pendingAbandon || newer.pendingAbandon) {
            entries[id] = {
                ...older,
                pendingCreate: undefined,
                pendingOps: [],
                pendingAbandon: true,
            };
            continue;
        }
        const known = new Set(older.pendingOps.map((i) => i.id));
        entries[id] = {
            ...older,
            createSent: older.createSent ?? newer.createSent,
            pendingOps: [
                ...older.pendingOps,
                ...newer.pendingOps.filter((i) => !known.has(i.id)),
            ],
        };
    }

    const myOpIds = [...(persisted.myOpIds ?? [])];
    const knownIds = new Set(myOpIds);
    myOpIds.push(...current.myOpIds.filter((i) => !knownIds.has(i)));

    return {
        ...current,
        entries,
        lastOpenedLiveMatchId: {
            ...persisted.lastOpenedLiveMatchId,
            ...current.lastOpenedLiveMatchId,
        },
        myOpIds: myOpIds.slice(-MAX_MY_OP_IDS),
    };
}

interface LiveMatchOutboxStore extends OutboxState {
    actions: {
        start: (...args: Tail<Parameters<typeof outbox.start>>) => void;
        enqueue: (...args: Tail<Parameters<typeof outbox.enqueue>>) => void;
        markCreateSent: (id: string) => void;
        abandon: (...args: Tail<Parameters<typeof outbox.abandon>>) => void;
        ackCreate: (id: string) => void;
        ackOps: (id: string, opIds: string[]) => void;
        drop: (id: string) => void;
        dropGroup: (groupId: string) => void;
        setFailing: (id: string, failing: boolean) => void;
        setLastOpened: (groupId: string, id: string) => void;
    };
}

type Tail<T extends unknown[]> = T extends [unknown, ...infer Rest]
    ? Rest
    : never;

export const useLiveMatchOutboxStore = create<LiveMatchOutboxStore>()(
    persist(
        (set) => ({
            ...emptyOutbox,

            actions: {
                start: (...args) => set((s) => outbox.start(s, ...args)),
                enqueue: (...args) => set((s) => outbox.enqueue(s, ...args)),
                markCreateSent: (id) =>
                    set((s) => outbox.markCreateSent(s, id)),
                abandon: (...args) => set((s) => outbox.abandon(s, ...args)),
                ackCreate: (id) => set((s) => outbox.ackCreate(s, id)),
                ackOps: (id, opIds) => set((s) => outbox.ackOps(s, id, opIds)),
                drop: (id) => set((s) => outbox.drop(s, id)),
                dropGroup: (groupId) =>
                    set((s) => outbox.dropGroup(s, groupId)),
                setFailing: (id, failing) =>
                    set((s) => outbox.setFailing(s, id, failing)),
                setLastOpened: (groupId, id) =>
                    set((s) => outbox.setLastOpened(s, groupId, id)),
            },
        }),
        {
            name: 'live-match-outbox',
            version: 1,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                entries: state.entries,
                lastOpenedLiveMatchId: state.lastOpenedLiveMatchId,
                myOpIds: state.myOpIds,
            }),
            merge: (persisted, current) => ({
                ...current,
                ...mergeOutbox(restoreOutbox(persisted), current),
            }),
        }
    )
);

export const liveMatchOutbox = () => useLiveMatchOutboxStore.getState();
