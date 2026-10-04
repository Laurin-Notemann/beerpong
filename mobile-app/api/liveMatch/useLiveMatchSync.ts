import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
    abandonLiveMatch,
    appendLiveMatchOps,
    createLiveMatch,
} from '@/api/calls/liveMatchHooks';
import {
    applyLiveMatchEnd,
    applyLiveMatchOps,
    applyLiveMatchStart,
    invalidateLiveMatch,
} from '@/api/liveMatch/liveMatchCache';
import { captureMutationErr } from '@/api/utils/captureException';
import { useApi } from '@/api/utils/create-api';
import { createSyncEngine } from '@/lib/liveMatch/sync';
import { ScopedLogger } from '@/utils/logging';
import { useLiveMatchOutboxStore } from '@/zustand/liveMatchOutboxStore';

const logger = new ScopedLogger('live-match-sync');

let engine: ReturnType<typeof createSyncEngine> | undefined;

/** sends every live match's queued edits now, skipping the back-off */
export const requestLiveMatchSync = () => engine?.kick(true);

/**
 * Sends the live match edits queued on this phone (`liveMatchOutboxStore`) to the server.
 * Mounted once, inside the `ApiProvider`. Runs whenever something is queued, when the app comes
 * to the foreground and when the socket reconnects; retries with back-off in between.
 */
export function useLiveMatchSync() {
    const { api, realtime } = useApi();
    const qc = useQueryClient();

    useEffect(() => {
        const store = useLiveMatchOutboxStore;
        const { actions } = store.getState();

        const sync = createSyncEngine({
            getEntry: (id) => store.getState().entries[id],
            getEntryIds: () => Object.keys(store.getState().entries),

            send: async (id, entry, request) => {
                const client = await api;

                if (request.kind === 'create') {
                    const match = await createLiveMatch(
                        client,
                        entry.groupId,
                        id,
                        entry.seasonId,
                        request.ops
                    );
                    // discarded while the create was on its way: end it for everyone
                    if (!store.getState().entries[id]) {
                        applyLiveMatchEnd(
                            qc,
                            entry.groupId,
                            await abandonLiveMatch(client, entry.groupId, id)
                        );
                        return;
                    }
                    applyLiveMatchStart(qc, entry.groupId, match);
                } else {
                    const result = await appendLiveMatchOps(
                        client,
                        entry.groupId,
                        id,
                        request.ops
                    );
                    applyLiveMatchOps(qc, entry.groupId, {
                        liveMatchId: id,
                        lastSeq: result.lastSeq,
                        ops: result.ops ?? [],
                    });
                }
            },
            onSent: (id, request) => {
                if (request.kind === 'create') actions.ackCreate(id);
                else
                    actions.ackOps(
                        id,
                        request.ops.map((i) => i.id)
                    );
            },
            onEnded: (id, entry) => {
                logger.info('live match ended, dropping its queued edits', id);
                actions.drop(id);
                invalidateLiveMatch(qc, entry.groupId, id);
            },
            onPoison: (id, entry, request, error) => {
                logger.error('server rejected live match ops for good', id);
                Sentry.captureException(error, {
                    tags: { liveMatchSync: 'poison' },
                    extra: { liveMatchId: id, request },
                });
                if (request.kind === 'create') actions.drop(id);
                else
                    actions.ackOps(
                        id,
                        request.ops.map((i) => i.id)
                    );
                invalidateLiveMatch(qc, entry.groupId, id);
            },
            onFailed: (id, error, kind, firstInARow) => {
                logger.warn('live match sync failed, will retry', id, kind);
                // network and server errors are already reported by the api client
                if (kind === 'other' && firstInARow) {
                    captureMutationErr('liveMatchSync')(error);
                }
            },
            setFailing: (id, failing) => actions.setFailing(id, failing),
        });
        engine = sync;

        // also covers the outbox being restored from disk after launch
        const unsubscribe = store.subscribe((state, prev) => {
            if (state.entries !== prev.entries) sync.kick();
        });
        const appState = AppState.addEventListener('change', (next) => {
            if (next === 'active') sync.kick(true);
        });
        sync.kick();

        return () => {
            unsubscribe();
            appState.remove();
            sync.stop();
            if (engine === sync) engine = undefined;
        };
    }, [api, qc]);

    useEffect(
        () => realtime?.on.reconnect(() => engine?.kick(true)),
        [realtime]
    );
}
