import { isIncomplete } from '@/lib/liveMatch/cache';
import { errorCode } from '@/lib/liveMatch/sync';
import type { LiveMatchDto } from '@/lib/liveMatch/types';

/** finish couldn't send this phone's last edits in time */
export class LiveMatchOfflineError extends Error {
    constructor() {
        super(
            "Can't reach the server. Your edits are saved; finish again when you're back online."
        );
        this.name = 'LiveMatchOfflineError';
    }
}

/** someone changed the score while this phone was finishing, and it no longer has one finish */
export class LiveMatchScoreChangedError extends Error {
    constructor() {
        super('The score changed while finishing. Check it and finish again.');
        this.name = 'LiveMatchScoreChangedError';
    }
}

export interface FinishDeps {
    /** the server's log as cached on this phone, if it is */
    cached: LiveMatchDto | undefined;
    /** fetches the whole log and writes it to the cache */
    refetch: () => Promise<LiveMatchDto>;
    /** finishes the match as reduced from exactly this log (its `lastSeq` is the expected seq) */
    send: (server: LiveMatchDto) => Promise<LiveMatchDto>;
    /** the finishes in the log, or undefined while the rules aren't loaded */
    countFinishes: (server: LiveMatchDto) => number | undefined;
    /** the server says the match already ended */
    onEnded: () => void;
}

/**
 * Sends the finish for the log this phone has. If someone edited the match meanwhile (the server
 * answers stale), it refetches and retries once with their edits, as long as the match still has
 * exactly one finish. Without the rules loaded, the server's validation decides.
 */
export async function finishWithRetry(deps: FinishDeps) {
    // expectedSeq has to match the log that was reduced, so a log with holes is refetched
    let server = deps.cached;
    if (!server || isIncomplete(server)) server = await deps.refetch();

    for (let attempt = 0; ; attempt++) {
        try {
            return await deps.send(server);
        } catch (error) {
            const code = errorCode(error);
            if (code === 'liveMatchEnded') deps.onEnded();
            if (code !== 'liveMatchStale') throw error;
            if (attempt > 0) throw new LiveMatchScoreChangedError();

            server = await deps.refetch();
            const finishes = deps.countFinishes(server);
            if (finishes !== undefined && finishes !== 1) {
                throw new LiveMatchScoreChangedError();
            }
        }
    }
}
