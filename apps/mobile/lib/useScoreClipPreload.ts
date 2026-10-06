import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('score-clips');
const owners = new Map<symbol, string[]>();
interface ClipDownload {
    controller: AbortController;
    file?: File;
    ready: boolean;
    loading: boolean;
    retryAt: number;
}
const clips = new Map<string, ClipDownload>();
const MAX_BYTES = 128 * 1024 * 1024;
const MAX_CLIP_BYTES = 16 * 1024 * 1024;
let directory: Directory | undefined;
let sequence = 0;
let loading = false;

/** Use a downloaded file when ready, without making a score wait for a download. */
export function scoreClipSource(url: string) {
    const clip = clips.get(url);
    return clip?.ready && clip.file?.exists ? clip.file.uri : url;
}

/**
 * The live match's entry screens share downloads of every participant's clips. Files stay on
 * disk, not in JS memory or hidden video players. A toast keeps its file until it stops playing;
 * when the last screen using a clip leaves, its file and pending download are released.
 */
export function useScoreClipPreload(urls: string[]) {
    const owner = useRef(Symbol('score-clips'));
    const key = JSON.stringify([...new Set(urls)].sort());
    useEffect(() => {
        if (Platform.OS === 'web') return;
        owners.set(owner.current, JSON.parse(key) as string[]);
        updateDownloads();
        // Retry failed preloads after reconnects without blocking the match's cached render.
        if (key === '[]') return;
        const retry = setInterval(updateDownloads, 30_000);
        return () => clearInterval(retry);
    }, [key]);
    useEffect(() => {
        const id = owner.current;
        return () => {
            owners.delete(id);
            updateDownloads();
        };
    }, []);
}

function updateDownloads() {
    const urls = new Set([...owners.values()].flat());
    for (const [url, clip] of clips) {
        if (urls.has(url)) continue;
        clip.controller.abort();
        clips.delete(url);
        if (!clip.loading) removeFile(clip);
    }
    for (const url of urls) {
        if (!clips.has(url)) {
            clips.set(url, {
                controller: new AbortController(),
                ready: false,
                loading: false,
                retryAt: 0,
            });
        }
    }
    loadNext();
}

function loadNext() {
    if (loading) return;
    for (const [url, clip] of clips) {
        if (clip.ready || clip.retryAt > Date.now()) continue;
        loading = true;
        clip.loading = true;
        clip.controller = new AbortController();
        void download(url, clip).finally(() => {
            loading = false;
            clip.loading = false;
            loadNext();
        });
        break;
    }
}

async function download(url: string, clip: ClipDownload) {
    const timeout = setTimeout(() => clip.controller.abort(), 60_000);
    try {
        if (!directory) {
            directory = new Directory(Paths.cache, 'score-clip-preloads');
            // Discard files left by a previous app process; only this session's matches own them.
            if (directory.exists) directory.delete();
            directory.create({ intermediates: true });
        }
        clip.file = new File(directory, `${++sequence}.mp4`);
        await File.downloadFileAsync(url, clip.file, {
            signal: clip.controller.signal,
            onProgress: ({ bytesWritten, totalBytes }) => {
                if (Math.max(bytesWritten, totalBytes) > MAX_CLIP_BYTES) {
                    clip.controller.abort();
                }
            },
        });
        if (clips.get(url) !== clip || clip.controller.signal.aborted) {
            removeFile(clip);
            return;
        }
        const retained = [...clips.values()].reduce(
            (sum, i) => sum + (i.ready ? (i.file?.size ?? 0) : 0),
            0
        );
        if (
            clip.file.size > MAX_CLIP_BYTES ||
            retained + clip.file.size > MAX_BYTES
        ) {
            removeFile(clip);
            clip.retryAt = Infinity;
            return;
        }
        clip.ready = true;
    } catch (err) {
        removeFile(clip);
        if (clips.get(url) !== clip) return;
        clip.retryAt = Date.now() + 30_000;
        logger.warn(
            'failed to preload a score clip; playback will stream it',
            err
        );
    } finally {
        clearTimeout(timeout);
    }
}

function removeFile(clip: ClipDownload) {
    try {
        if (clip.file?.exists) clip.file.delete();
    } catch (err) {
        logger.warn('failed to remove a preloaded score clip', err);
    }
}
