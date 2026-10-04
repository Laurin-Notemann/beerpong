import { hasGap, mergeOps } from '@/lib/liveMatch/log';
import type { LiveMatchDto, LiveMatchOpDto } from '@/lib/liveMatch/types';

/**
 * The next values of the cached live matches, as pure functions. The caches hold the wire DTOs
 * and are persisted to disk, so everything read from them goes through `asLiveMatch` /
 * `asLiveMatchList` first: a value written by an older app version can't crash this one.
 */

/** `LiveMatchOpsEventDto`, the body of the `liveMatchOps` socket event */
export interface LiveMatchOpsEvent {
    liveMatchId: string;
    lastSeq?: number;
    ops: LiveMatchOpDto[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const asOps = (value: unknown) =>
    Array.isArray(value) ? (value.filter(isObject) as LiveMatchOpDto[]) : [];

/**
 * Older servers wrote socket dates as `2026-10-04T18:15:30Z[Etc/UTC]`, which `Date.parse` can't
 * read (a timer would freeze at 0:00). The zone id adds nothing to the offset before it.
 */
export const withoutZoneId = <T>(date: T) =>
    typeof date === 'string' ? date.replace(/\[[^\]]*\]$/, '') : date;

export function asLiveMatch(value: unknown): LiveMatchDto | undefined {
    if (!isObject(value) || typeof value.id !== 'string') return;

    const match = value as LiveMatchDto;
    return {
        ...match,
        startedAt: withoutZoneId(match.startedAt),
        lastActivityAt: withoutZoneId(match.lastActivityAt),
        endedAt: withoutZoneId(match.endedAt),
        ops: asOps(value.ops),
    };
}

export const asLiveMatchList = (value: unknown) =>
    Array.isArray(value) ? value.flatMap((i) => asLiveMatch(i) ?? []) : [];

export function asOpsEvent(value: unknown): LiveMatchOpsEvent | undefined {
    if (!isObject(value) || typeof value.liveMatchId !== 'string') return;

    return {
        liveMatchId: value.liveMatchId,
        lastSeq: typeof value.lastSeq === 'number' ? value.lastSeq : undefined,
        ops: asOps(value.ops),
    };
}

export const isEnded = (match: LiveMatchDto | undefined) =>
    !!match?.status && match.status !== 'IN_PROGRESS';

/**
 * Whether the cached log is missing ops: a seq in the middle (a missed socket event), or ops
 * at the end that the server says exist. Such a match has to be refetched.
 */
export const isIncomplete = (match: LiveMatchDto) => {
    const ops = match.ops ?? [];
    return hasGap(ops) || (match.lastSeq ?? 0) > ops.length;
};

/**
 * Combines what's cached with a newer copy from the server. The log only grows and an op never
 * changes once it has a seq, so the ops are the union of both. A copy fetched before the match
 * ended can arrive after the end event; an ended match stays ended.
 */
export function mergeLiveMatch(
    cached: LiveMatchDto | undefined,
    incoming: LiveMatchDto
): LiveMatchDto {
    if (!cached || cached.id !== incoming.id) {
        return { ...incoming, ops: mergeOps([], asOps(incoming.ops)) };
    }
    const header = isEnded(cached) && !isEnded(incoming) ? cached : incoming;
    const ops = mergeOps(cached.ops ?? [], asOps(incoming.ops));

    return {
        ...header,
        lastSeq: Math.max(
            cached.lastSeq ?? 0,
            incoming.lastSeq ?? 0,
            ops.at(-1)?.seq ?? 0
        ),
        ops,
    };
}

/** appends the ops of a socket event or an append response */
export function withOps(
    cached: LiveMatchDto,
    event: LiveMatchOpsEvent
): LiveMatchDto {
    return mergeLiveMatch(cached, {
        ...cached,
        lastSeq: event.lastSeq,
        ops: event.ops,
    });
}

/** the end state, keeping the ops (the end event carries none) */
export const withEnd = (
    cached: LiveMatchDto | undefined,
    end: LiveMatchDto
): LiveMatchDto =>
    mergeLiveMatch(cached, { ...end, ops: [...(cached?.ops ?? [])] });

/** adds or replaces a match in the list of matches in progress; an ended one is removed */
export function upsertInList(list: LiveMatchDto[], match: LiveMatchDto) {
    const without = list.filter((i) => i.id !== match.id);

    if (isEnded(match)) return without;

    const cached = list.find((i) => i.id === match.id);
    return [mergeLiveMatch(cached, match), ...without];
}

export const removeFromList = (list: LiveMatchDto[], id: string) =>
    list.filter((i) => i.id !== id);

export const updateInList = (
    list: LiveMatchDto[],
    id: string,
    update: (match: LiveMatchDto) => LiveMatchDto
) => list.map((i) => (i.id === id ? update(i) : i));

/**
 * A fetched list decides which matches are in progress, but a match that the cache already
 * knows has ended stays out (the fetch may have started before the end event arrived), and
 * ops the cache got from socket events in the meantime are kept.
 */
export function mergeFetchedList(
    cached: LiveMatchDto[],
    fetched: LiveMatchDto[],
    isKnownEnded: (id: string) => boolean
) {
    return fetched
        .filter((i) => i.id && !isEnded(i) && !isKnownEnded(i.id))
        .map((match) =>
            mergeLiveMatch(
                cached.find((i) => i.id === match.id),
                match
            )
        );
}
