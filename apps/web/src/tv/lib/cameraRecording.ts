import * as Sentry from '@sentry/browser';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CameraRecordingCreateDto } from '@/openapi/openapi';
import { useGroupSocket } from '~/tv/lib/hooks';
import { getCameraMatches } from '~/tv/server/functions';

const SEGMENT_MS = 30_000;
const MAX_SEGMENT_BYTES = 32 * 1024 * 1024;
const MAX_QUEUE_BYTES = 90 * 1024 * 1024;
const MAX_QUEUE_SEGMENTS = 6;

interface Segment {
    id: string;
    metadata: CameraRecordingCreateDto & { groupId: string };
    blob: Blob;
    attempts: number;
}

function warning(message: string, extra?: Record<string, unknown>) {
    Sentry.captureMessage(message, {
        level: 'warning',
        tags: { feature: 'camera-recording' },
        extra,
    });
}

/** Follow the group's socket immediately; polling and reconnect snapshots cover missed events. */
export function useCameraMatches(
    id: string,
    secret: string,
    groupId: string | null,
    enabled: boolean
) {
    const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getCameraMatches>>>(null);
    const generation = useRef(0);
    const refresh = useCallback(async () => {
        const current = ++generation.current;
        try {
            const next = await getCameraMatches({ data: { id, key: secret } });
            if (current === generation.current) setSnapshot(next);
        } catch (error) {
            Sentry.captureException(error, { tags: { feature: 'camera-recording-snapshot' } });
        }
    }, [id, secret]);
    useGroupSocket(enabled ? groupId : null, refresh);
    useEffect(() => {
        setSnapshot(null);
        if (!enabled || !groupId) return;
        void refresh();
        const timer = setInterval(() => void refresh(), 15_000);
        return () => {
            generation.current++;
            clearInterval(timer);
        };
    }, [enabled, groupId, refresh]);
    return snapshot?.groupId === groupId ? snapshot : null;
}

/** Recording and uploading never change the stream or wait on the TV's WebRTC connection. */
export function useCameraRecording(
    id: string,
    secret: string,
    stream: MediaStream | null,
    groupId: string | null,
    snapshot: ReturnType<typeof useCameraMatches>
) {
    const [recording, setRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(0);
    const session = useRef<string | null>(null);
    const index = useRef(0);
    const queue = useRef<Segment[]>([]);
    const activeGroup = useRef(groupId);
    activeGroup.current = groupId;
    const upload = useRef<AbortController | null>(null);
    const wakeUpload = useRef(() => {});

    // One upload at a time, with bounded backoff. A page reload loses only queued/in-flight footage.
    useEffect(() => {
        let stopped = false;
        let busy = false;
        let retry: ReturnType<typeof setTimeout> | undefined;
        const drain = async () => {
            if (stopped || busy) return;
            clearTimeout(retry);
            retry = undefined;
            const segment = queue.current[0];
            if (!segment) return;
            if (segment.metadata.groupId !== activeGroup.current) {
                queue.current.shift();
                warning('Camera recording dropped after camera removal or re-pairing');
                setPending(queue.current.length);
                void drain();
                return;
            }
            busy = true;
            const controller = new AbortController();
            upload.current = controller;
            const timeout = setTimeout(() => controller.abort(), 130_000);
            try {
                const res = await fetch(`/tv/api/cameras/${id}/recordings/${segment.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': segment.metadata.contentType,
                        'X-Camera-Key': secret,
                        'X-Recording-Metadata': JSON.stringify(segment.metadata),
                    },
                    body: segment.blob,
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`Camera recording upload failed (${res.status})`);
                queue.current = queue.current.filter((item) => item !== segment);
            } catch (err) {
                if (!stopped) {
                    segment.attempts++;
                    Sentry.captureException(err, {
                        tags: { feature: 'camera-recording-upload' },
                        extra: { segmentId: segment.id, attempt: segment.attempts },
                    });
                }
            } finally {
                clearTimeout(timeout);
                upload.current = null;
                busy = false;
            }
            if (stopped) return;
            setPending(queue.current.length);
            retry = setTimeout(
                drain,
                segment.attempts ? Math.min(30_000, 1_000 * 2 ** Math.min(segment.attempts, 5)) : 0
            );
        };
        wakeUpload.current = () => {
            // New segments don't cancel a failed upload's backoff.
            if (!retry) void drain();
        };
        const online = () => {
            clearTimeout(retry);
            retry = undefined;
            void drain();
        };
        window.addEventListener('online', online);
        return () => {
            stopped = true;
            clearTimeout(retry);
            upload.current?.abort();
            window.removeEventListener('online', online);
        };
    }, [id, secret]);

    useEffect(() => {
        upload.current?.abort();
        wakeUpload.current();
    }, [groupId]);

    const matchKey = snapshot?.liveMatchIds.slice().sort().join(',') ?? '';
    const cameraName = snapshot?.name ?? 'Camera';
    useEffect(() => {
        setError(null);
        if (!stream || !groupId || !matchKey) {
            setRecording(false);
            return;
        }
        if (typeof MediaRecorder === 'undefined') {
            setError("This browser can't save match footage.");
            warning('MediaRecorder is unavailable on the camera');
            return;
        }
        const mimeType = [
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4',
            'video/webm;codecs=vp8',
            'video/webm',
        ].find((mime) => MediaRecorder.isTypeSupported(mime));
        if (!mimeType) {
            setError("This browser can't save MP4 or WebM footage.");
            warning('Camera has no supported recording format');
            return;
        }
        session.current ??= crypto.randomUUID();
        let stopped = false;
        let stopCurrent = () => {};
        let timer: ReturnType<typeof setTimeout> | undefined;
        const start = () => {
            if (stopped) return;
            const startedAt = new Date().toISOString();
            const segmentIndex = index.current++;
            const chunks: Blob[] = [];
            let bytes = 0;
            let endedAt: string | undefined;
            let failed = false;
            let current: MediaRecorder | undefined;
            const stop = () => {
                if (current?.state === 'recording') {
                    endedAt = new Date().toISOString();
                    current.stop();
                }
            };
            try {
                // Use the original 720p camera stream, not the feed's capped encoder.
                current = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
                const fileRecorder = current;
                stopCurrent = stop;
                current.ondataavailable = (event) => {
                    bytes += event.data.size;
                    if (bytes <= MAX_SEGMENT_BYTES) chunks.push(event.data);
                    else if (!failed) {
                        failed = true;
                        warning('Camera recording segment exceeded memory limit');
                        stop();
                    }
                };
                current.onerror = (event) => {
                    failed = true;
                    setError('Recording failed. Reopen the camera page to try again.');
                    Sentry.captureException(new Error('Camera MediaRecorder failed'), {
                        tags: { feature: 'camera-recording' },
                        extra: { type: event.type },
                    });
                    stop();
                };
                current.onstop = () => {
                    clearTimeout(timer);
                    if (!stopped) setRecording(false);
                    endedAt ??= new Date().toISOString();
                    const blob = new Blob(chunks, { type: fileRecorder.mimeType });
                    if (!failed && blob.size > 0 && endedAt && endedAt > startedAt) {
                        const segment: Segment = {
                            id: crypto.randomUUID(),
                            blob,
                            attempts: 0,
                            metadata: {
                                groupId,
                                cameraId: id,
                                cameraName,
                                sessionId: session.current!,
                                segmentIndex,
                                startedAt,
                                endedAt,
                                liveMatchIds: matchKey.split(
                                    ','
                                ) as CameraRecordingCreateDto['liveMatchIds'],
                                contentType: fileRecorder.mimeType.startsWith('video/mp4')
                                    ? 'video/mp4'
                                    : 'video/webm',
                                sizeBytes: blob.size,
                            },
                        };
                        queue.current.push(segment);
                        let queuedBytes = queue.current.reduce(
                            (total, item) => total + item.blob.size,
                            0
                        );
                        while (
                            queue.current.length > MAX_QUEUE_SEGMENTS ||
                            queuedBytes > MAX_QUEUE_BYTES
                        ) {
                            const oldest = queue.current.shift()!;
                            queuedBytes -= oldest.blob.size;
                            warning('Camera recording queue full; dropped oldest segment', {
                                segmentId: oldest.id,
                            });
                        }
                        setPending(queue.current.length);
                        wakeUpload.current();
                    }
                    if (!stopped && !failed) start();
                };
                current.start(1_000);
                setRecording(true);
                timer = setTimeout(stop, SEGMENT_MS);
            } catch (err) {
                setRecording(false);
                setError('Recording failed. Reopen the camera page to try again.');
                Sentry.captureException(err, { tags: { feature: 'camera-recording' } });
            }
        };
        start();
        const close = () => {
            stopped = true;
            clearTimeout(timer);
            stopCurrent();
            setRecording(false);
        };
        // pagehide bounds the unfinished file; queued blobs intentionally live only in memory.
        window.addEventListener('pagehide', close);
        return () => {
            close();
            window.removeEventListener('pagehide', close);
        };
    }, [stream, groupId, matchKey, id, cameraName]);

    return { recording, error, pending };
}
