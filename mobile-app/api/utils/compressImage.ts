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
 * as JPEG. The result is upright (EXIF orientation applied) and ready for `uploadImage`.
 */
export async function compressImage(
    uri: string,
    { maxSize, quality }: { maxSize: number; quality: number }
): Promise<{ byteArray: Uint8Array; mimeType: 'image/jpeg' }> {
    const context = ImageManipulator.manipulate(uri);
    let image = await context.renderAsync();
    if (Math.max(image.width, image.height) > maxSize) {
        context.resize(
            image.width >= image.height
                ? { width: maxSize }
                : { height: maxSize }
        );
        image = await context.renderAsync();
    }
    const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: quality,
    });
    return {
        byteArray: await readAsByteArray(result.uri),
        mimeType: 'image/jpeg',
    };
}
