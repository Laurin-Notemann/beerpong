import { createVideoPlayer, VideoThumbnail } from 'expo-video';
import { useEffect, useState } from 'react';

import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('score-clip-thumbnail');

/** a clip that isn't ready by then gets no thumbnail (this time) */
const TIMEOUT_MS = 20_000;

/** by clip URL: a new upload is a new asset, so a URL's frame never changes */
const thumbnails = new Map<string, Promise<VideoThumbnail | null>>();

/**
 * The first frame of a score clip, as an expo-image source: undefined while it loads, null if it
 * couldn't. Each clip's player only lives until its frame is taken, so a page of tiles doesn't
 * hold a video decoder per clip (Android has only a few).
 */
export function useScoreClipThumbnail(url: string) {
    const [thumbnail, setThumbnail] = useState<VideoThumbnail | null>();

    useEffect(() => {
        let cancelled = false;
        void thumbnailOf(url).then((i) => {
            if (!cancelled) setThumbnail(i);
        });
        return () => {
            cancelled = true;
        };
    }, [url]);

    return thumbnail;
}

function thumbnailOf(url: string) {
    let thumbnail = thumbnails.get(url);
    if (!thumbnail) {
        thumbnail = firstFrame(url).catch((err) => {
            logger.warn('failed to load a score clip thumbnail', err);
            // the next tile showing it tries again
            thumbnails.delete(url);
            return null;
        });
        thumbnails.set(url, thumbnail);
    }
    return thumbnail;
}

async function firstFrame(url: string) {
    const player = createVideoPlayer(url);
    player.muted = true;
    try {
        // iOS has no asset to take a frame from before the clip loads
        await new Promise<void>((resolve, reject) => {
            if (player.status === 'readyToPlay') return resolve();
            const timeout = setTimeout(() => {
                sub.remove();
                reject(new Error('timed out'));
            }, TIMEOUT_MS);
            const sub = player.addListener(
                'statusChange',
                ({ status, error }) => {
                    if (status !== 'readyToPlay' && status !== 'error') return;
                    clearTimeout(timeout);
                    sub.remove();
                    if (status === 'readyToPlay') resolve();
                    else reject(new Error(error?.message));
                }
            );
        });
        const [thumbnail] = await player.generateThumbnailsAsync(0, {
            maxWidth: 360,
        });
        return thumbnail ?? null;
    } finally {
        player.release();
    }
}
