import { isAxiosError } from 'axios';

import { BackOff, FIBONACCI_TIMEOUTS } from '@/api/utils/BackOff';
import type { LiveOp } from '@/lib/liveMatch/types';
import type { OutboxEntry } from '@/zustand/liveMatchOutboxStore';

/**
 * Drains the live match outbox: per match, the create first, then the ops in batches, one
 * request in flight at a time so the server sees my ops in the order I made them. A discard
 * goes first of all, and still after a create that's already on its way. Has no React
 * or network code of its own (see `useLiveMatchSync`), so the retry rules can be tested.
 */

export const MAX_OPS_PER_REQUEST = 50;

/** 1 s up to 55 s; foreground and socket reconnect retry right away anyway */
export const SYNC_RETRY_TIMEOUTS = FIBONACCI_TIMEOUTS.map((ms) => ms * 10);

export type SyncRequest =
    | { kind: 'abandon' }
    | { kind: 'create'; ops: LiveOp[] }
    | { kind: 'ops'; ops: LiveOp[] };

export function nextRequest(entry: OutboxEntry): SyncRequest | undefined {
    if (entry.pendingAbandon) return { kind: 'abandon' };
    if (entry.pendingCreate) {
        return { kind: 'create', ops: entry.pendingCreate.ops };
    }
    if (entry.pendingOps.length) {
        return {
            kind: 'ops',
            ops: entry.pendingOps.slice(0, MAX_OPS_PER_REQUEST),
        };
    }
}

/** `ResponseEnvelope.error.code` of a failed request */
export function errorCode(error: unknown): string | undefined {
    if (!isAxiosError(error)) return;

    const code = error.response?.data?.error?.code;
    return typeof code === 'string' ? code : undefined;
}

/**
 * - `retry`: no answer or a server error. A 500 can also be two identical first creates racing;
 *   the retry then gets the existing match.
 * - `ended`: the match is over or gone; what's queued for it can never be sent.
 * - `poison`: the server will never take this request (any other 4xx, e.g. a season that ended
 *   or a user removed from the group); it's dropped so it can't block what comes after it.
 *   A create that's poison drops the whole match on this phone.
 * - `other`: kept and retried, in case it's temporary (401 until the token refreshes, 408, 429,
 *   an error that isn't from the server).
 */
export type SyncErrorKind = 'retry' | 'ended' | 'poison' | 'other';

const TEMPORARY_STATUSES = [401, 408, 429];

export function classifySyncError(error: unknown): SyncErrorKind {
    switch (errorCode(error)) {
        case 'liveMatchEnded':
        case 'liveMatchNotFound':
            return 'ended';
    }
    if (!isAxiosError(error)) return 'other';

    const status = error.response?.status;
    if (!status || status >= 500) return 'retry';
    if (status >= 400 && !TEMPORARY_STATUSES.includes(status)) return 'poison';
    return 'other';
}

export interface SyncDeps {
    getEntry: (id: string) => OutboxEntry | undefined;
    getEntryIds: () => string[];
    /** right before a request goes out */
    onSending?: (id: string, request: SyncRequest) => void;
    /** sends the request and writes the server's answer to the cache */
    send: (
        id: string,
        entry: OutboxEntry,
        request: SyncRequest
    ) => Promise<void>;
    /** takes the sent ops out of the outbox */
    onSent: (id: string, request: SyncRequest) => void;
    /** drop everything queued for the match and refetch it */
    onEnded: (id: string, entry: OutboxEntry, error: unknown) => void;
    /** take the request's ops out of the outbox and report them */
    onPoison: (
        id: string,
        entry: OutboxEntry,
        request: SyncRequest,
        error: unknown
    ) => void;
    /** `firstInARow` is false for the retries after it, so a long outage is reported once */
    onFailed: (
        id: string,
        error: unknown,
        kind: SyncErrorKind,
        firstInARow: boolean
    ) => void;
    setFailing: (id: string, failing: boolean) => void;
    timeouts?: number[];
}

export function createSyncEngine(deps: SyncDeps) {
    const running = new Set<string>();
    const retries = new Map<
        string,
        { backOff: BackOff; timer?: ReturnType<typeof setTimeout> }
    >();
    let stopped = false;

    const retryState = (id: string) => {
        let state = retries.get(id);
        if (!state) {
            state = {
                backOff: new BackOff(deps.timeouts ?? SYNC_RETRY_TIMEOUTS),
            };
            retries.set(id, state);
        }
        return state;
    };

    function clearRetry(id: string) {
        clearTimeout(retries.get(id)?.timer);
        retries.delete(id);
    }

    async function drain(id: string) {
        running.add(id);
        try {
            while (!stopped) {
                const entry = deps.getEntry(id);
                const request = entry && nextRequest(entry);
                if (!entry || !request) {
                    clearRetry(id);
                    deps.setFailing(id, false);
                    return;
                }
                try {
                    deps.onSending?.(id, request);
                    await deps.send(id, entry, request);
                    if (stopped) return;
                    retries.get(id)?.backOff.reset();
                    deps.setFailing(id, false);
                    deps.onSent(id, request);
                } catch (error) {
                    const kind = classifySyncError(error);

                    if (kind === 'ended') {
                        clearRetry(id);
                        deps.setFailing(id, false);
                        deps.onEnded(id, entry, error);
                        return;
                    }
                    if (kind === 'poison') {
                        deps.onPoison(id, entry, request, error);
                        continue;
                    }
                    const retry = retryState(id);
                    deps.onFailed(
                        id,
                        error,
                        kind,
                        retry.backOff.getIndex() === 0
                    );
                    deps.setFailing(id, true);
                    retry.timer = setTimeout(() => {
                        retry.timer = undefined;
                        void drain(id);
                    }, retry.backOff.getAndIncrement());
                    return;
                }
            }
        } finally {
            running.delete(id);
        }
    }

    return {
        /**
         * Starts draining every match that isn't already. A match waiting for its retry is left
         * alone unless `now` (foreground, reconnect, finish), which retries it right away.
         */
        kick(now = false) {
            if (stopped) return;

            for (const id of deps.getEntryIds()) {
                if (running.has(id)) continue;

                const retry = retries.get(id);
                if (retry?.timer) {
                    if (!now) continue;
                    clearTimeout(retry.timer);
                    retry.timer = undefined;
                }
                void drain(id);
            }
        },
        stop() {
            stopped = true;
            for (const id of [...retries.keys()]) clearRetry(id);
        },
    };
}
