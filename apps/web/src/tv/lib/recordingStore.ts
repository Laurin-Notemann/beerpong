import * as Sentry from '@sentry/browser';

import type { CameraRecordingCreateDto } from '@/openapi/openapi';
import { fixMp4Duration } from '~/tv/lib/mp4Duration';

export type RecordingMetadata = CameraRecordingCreateDto & { groupId: string };
/** what a segment knows while it's still recording */
export type StartedMetadata = Omit<RecordingMetadata, 'endedAt' | 'sizeBytes'>;

/**
 * The camera's segments wait in IndexedDB, not only in memory, from their first second until the
 * bucket has them. After a reload, a crash or a closed tab, the next camera page uploads what's
 * left (`leftBehind`), the unfinished segment cut to its last whole fragment. Every call settles
 * even when IndexedDB is missing or fails (one Sentry warning per page); recording then works
 * from memory alone.
 */
export const recordingStore = {
    started: (id: string, metadata: StartedMetadata) =>
        write((segments) => segments.put({ id, metadata })),
    chunk: (id: string, n: number, blob: Blob) =>
        write((_, chunks) => chunks.put({ id, n, at: new Date().toISOString(), blob })),
    /** before the upload reserves it, so a later page retries it with the same metadata */
    finished: (id: string, metadata: RecordingMetadata, blob: Blob) =>
        write((segments, chunks) => {
            segments.put({ id, metadata, blob });
            chunks.delete(chunksOf(id));
        }),
    remove: (id: string) =>
        write((segments, chunks) => {
            segments.delete(id);
            chunks.delete(chunksOf(id));
        }),
};

type StoredSegment =
    | { id: string; metadata: StartedMetadata; blob?: undefined }
    | { id: string; metadata: RecordingMetadata; blob: Blob };

interface StoredChunk {
    id: string;
    n: number;
    at: string;
    blob: Blob;
}

/** Segments earlier pages left behind, oldest first; `session` is the one recording now. */
export async function leftBehind(session: string) {
    const stored = await readAll();
    if (!stored) return [];
    const found: { id: string; metadata: RecordingMetadata; blob: Blob }[] = [];
    const segments = stored.segments
        .filter((segment) => segment.metadata.sessionId !== session)
        .sort((a, b) => a.metadata.startedAt.localeCompare(b.metadata.startedAt));
    for (const segment of segments) {
        if (segment.blob) {
            found.push(segment);
            continue;
        }
        // the page went away while this one was recording
        const recovered = await unfinished(
            segment.metadata,
            stored.chunks.filter((chunk) => chunk.id === segment.id)
        );
        if (recovered) {
            await recordingStore.finished(segment.id, recovered.metadata, recovered.blob);
            found.push({ id: segment.id, ...recovered });
        } else {
            await recordingStore.remove(segment.id);
        }
    }
    const known = new Set(stored.segments.map((segment) => segment.id));
    for (const id of new Set(stored.chunks.map((chunk) => chunk.id))) {
        if (!known.has(id)) await recordingStore.remove(id);
    }
    return found;
}

/** The chunks recorded so far (in key order), as a file that ends with its last whole fragment. */
async function unfinished(metadata: StartedMetadata, chunks: StoredChunk[]) {
    if (!chunks.length) return null;
    let blob = new Blob(
        chunks.map((chunk) => chunk.blob),
        { type: metadata.contentType }
    );
    let endedAt = chunks[chunks.length - 1].at;
    if (metadata.contentType === 'video/mp4') {
        const fixed = await fixMp4Duration(blob);
        if (!fixed.durationMs) return null;
        blob = fixed.blob;
        endedAt = new Date(
            Date.parse(metadata.startedAt) + Math.round(fixed.durationMs)
        ).toISOString();
    }
    if (!blob.size || endedAt <= metadata.startedAt) return null;
    return { metadata: { ...metadata, endedAt, sizeBytes: blob.size }, blob };
}

const chunksOf = (id: string) => IDBKeyRange.bound([id, 0], [id, Infinity]);

let database: Promise<IDBDatabase | null> | undefined;
let reported = false;

function report(error: unknown) {
    if (reported) return;
    reported = true;
    Sentry.captureException(error ?? new Error('Camera recording store failed'), {
        level: 'warning',
        tags: { feature: 'camera-recording-store' },
    });
}

function open() {
    database ??= new Promise((resolve) => {
        try {
            const request = indexedDB.open('versus-camera-recordings', 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('segments', { keyPath: 'id' });
                request.result.createObjectStore('chunks', { keyPath: ['id', 'n'] });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                report(request.error);
                resolve(null);
            };
        } catch (error) {
            // no IndexedDB, or a private window that blocks it
            report(error);
            resolve(null);
        }
    });
    return database;
}

async function write(work: (segments: IDBObjectStore, chunks: IDBObjectStore) => void) {
    const db = await open();
    if (!db) return;
    await new Promise<void>((resolve) => {
        try {
            const tx = db.transaction(['segments', 'chunks'], 'readwrite');
            tx.oncomplete = () => resolve();
            // a failed request aborts the transaction, e.g. when storage is full
            tx.onabort = () => {
                report(tx.error);
                resolve();
            };
            work(tx.objectStore('segments'), tx.objectStore('chunks'));
        } catch (error) {
            report(error);
            resolve();
        }
    });
}

async function readAll() {
    const db = await open();
    if (!db) return null;
    return new Promise<{ segments: StoredSegment[]; chunks: StoredChunk[] } | null>((resolve) => {
        try {
            const tx = db.transaction(['segments', 'chunks'], 'readonly');
            const segments = tx.objectStore('segments').getAll();
            const chunks = tx.objectStore('chunks').getAll();
            tx.oncomplete = () => resolve({ segments: segments.result, chunks: chunks.result });
            tx.onabort = () => {
                report(tx.error);
                resolve(null);
            };
        } catch (error) {
            report(error);
            resolve(null);
        }
    });
}
