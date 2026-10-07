import { Directory, File, Paths } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { assetIdOf } from '@/api/utils/assetId';
import { compressImage } from '@/api/utils/compressImage';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('widgets');

/**
 * Where the Live Activity finds the players' avatars: in the app group, which the widget
 * extension can read but not download into. One small JPEG per avatar asset id.
 */
export function activityAvatarsDirectory(base: string) {
    return `${base.endsWith('/') ? base : base + '/'}activity-avatars/`;
}

const copying = new Set<string>();

/**
 * Keeps a small copy of each of these avatars where the Live Activity can show it (see
 * LiveMatchActivity.tsx); a new avatar is a new asset, so a copy never goes stale. The activity
 * shows initials for players this phone has no copy of yet.
 */
export function useActivityAvatars(avatarUrls: (string | null | undefined)[]) {
    const key = [
        ...new Set(
            avatarUrls.filter((i): i is string => typeof i === 'string' && !!i)
        ),
    ]
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .join(' ');

    useEffect(() => {
        if (Platform.OS !== 'ios' || !widgetsDirectory || !key) return;
        const directory = new Directory(
            activityAvatarsDirectory(widgetsDirectory)
        );

        for (const url of key.split(' ')) {
            const id = assetIdOf(url);
            const file = new File(directory, `${id}.jpg`);
            if (!id || copying.has(id) || file.exists) continue;
            copying.add(id);
            copy(url, directory, file)
                .catch((err) =>
                    logger.warn(
                        'failed to copy an avatar for the Live Activity',
                        err
                    )
                )
                .finally(() => copying.delete(id));
        }
    }, [key]);
}

async function copy(url: string, directory: Directory, file: File) {
    if (!directory.exists) directory.create({ intermediates: true });
    const download = new File(Paths.cache, file.name);
    if (download.exists) download.delete();
    await File.downloadFileAsync(url, download);
    const { byteArray } = await compressImage(download.uri, {
        maxSize: 96,
        quality: 0.7,
    });
    download.delete();
    await file.write(byteArray);
}
