import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { readAsByteArray } from '@/utils/fileUpload';

/**
 * Upload sizes. Avatars show at most ~120pt, team photos and wallpapers fill the
 * screen; anything bigger only costs data and memory on every phone that loads it.
 */
export const IMAGE_SIZES = {
    avatar: { maxSize: 512, quality: 0.8 },
    teamPhoto: { maxSize: 1600, quality: 0.75 },
    wallpaper: { maxSize: 2000, quality: 0.8 },
} as const;

/**
 * Scales the image at `uri` down so its longer edge is at most `maxSize` and encodes it
 * as JPEG. Loading with bounds decodes straight to the smaller size (the full-size photo
 * never sits in memory) and bakes the EXIF orientation into the pixels, so the bounds
 * apply to the image as displayed and the result is upright.
 */
export async function compressImage(
    uri: string,
    { maxSize, quality }: { maxSize: number; quality: number }
): Promise<{ byteArray: Uint8Array; mimeType: 'image/jpeg' }> {
    const image = await ImageManipulator.manipulate(uri, {
        maxWidth: maxSize,
        maxHeight: maxSize,
    }).renderAsync();
    const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: quality,
    });
    return {
        byteArray: await readAsByteArray(result.uri),
        mimeType: 'image/jpeg',
    };
}
