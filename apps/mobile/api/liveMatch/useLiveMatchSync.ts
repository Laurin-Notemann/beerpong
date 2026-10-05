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

            onSending: (id, request) => {
                if (request.kind === 'create') actions.markCreateSent(id);
            },
            send: async (id, entry, request) => {
                const client = await api;

                switch (request.kind) {
                    case 'abandon':
                        applyLiveMatchEnd(
                            qc,
                            entry.groupId,
                            await abandonLiveMatch(client, entry.groupId, id)
                        );
                        return;
                    case 'create':
                        applyLiveMatchStart(
                            qc,
                            entry.groupId,
                            await createLiveMatch(
                                client,
                                entry.groupId,
                                id,
                                entry.seasonId,
                                request.ops
                            )
                        );
                        return;
                    case 'ops': {
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
                }
            },
            onSent: (id, request) => {
                switch (request.kind) {
                    case 'abandon':
                        actions.drop(id);
                        break;
                    case 'create':
                        actions.ackCreate(id);
                        break;
                    case 'ops':
                        actions.ackOps(
                            id,
                            request.ops.map((i) => i.id)
                        );
                }
            },
            // also a discard of a match the server never got: nothing left to do
            onEnded: (id, entry) => {
                logger.info('live match ended, dropping its queued edits', id);
                actions.drop(id);
                invalidateLiveMatch(qc, entry.groupId, id);
            },
            // a create the server won't take drops the match on this phone
            onPoison: (id, entry, request, error) => {
                // reported once here, the api client doesn't report sync responses
                captureMutationErr('liveMatchSync')(error);
                logger.error(
                    'server rejected live match ops for good, dropping them',
                    id,
                    JSON.stringify(request)
                );
                if (request.kind === 'ops') {
                    actions.ackOps(
                        id,
                        request.ops.map((i) => i.id)
                    );
                } else {
                    actions.drop(id);
                }
                invalidateLiveMatch(qc, entry.groupId, id);
            },
            onFailed: (id, error, kind, firstInARow) => {
                logger.warn('live match sync failed, will retry', id, kind);
                // server errors are already reported by the api client
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
