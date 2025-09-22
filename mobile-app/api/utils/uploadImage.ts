const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/apng',
    'image/avif',
] as const;

const isValidImageMimeType = (
    mimeType: string
): mimeType is (typeof IMAGE_MIME_TYPES)[number] => {
    return IMAGE_MIME_TYPES.includes(
        mimeType as (typeof IMAGE_MIME_TYPES)[number]
    );
};

const isValidByteArray = (
    byteArray: Uint8Array<ArrayBuffer | ArrayBufferLike> | null | undefined
): byteArray is Uint8Array<ArrayBuffer | ArrayBufferLike> => {
    return !!byteArray && byteArray.length > 0;
};

const isValidSingleUploadUrl = (url: string | null | undefined) => {
    return !!url;
};

/**
 * upload to a `singleUploadUrl` returned from our backend
 *
 * @param mimeType - must be of type image, e.g. "image/jpeg", "image/png", "image/webp"
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
 */
export async function uploadImage(
    singleUploadUrl: string,
    byteArray: Uint8Array<ArrayBuffer | ArrayBufferLike>,
    debugLabel: string,
    mimeType: string
): Promise<void> {
    if (!isValidSingleUploadUrl(singleUploadUrl)) {
        throw new Error(
            `uploadImage(${debugLabel}): invalid singleUploadUrl "${singleUploadUrl}"`
        );
    }
    if (!isValidByteArray(byteArray)) {
        throw new Error(`uploadImage(${debugLabel}): invalid byteArray`);
    }
    if (!isValidImageMimeType(mimeType)) {
        throw new Error(
            `uploadImage(${debugLabel}): invalid mimeType "${mimeType}"`
        );
    }
    let res: Response;
    try {
        res = await fetch(singleUploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': mimeType,
            },
            body: byteArray as Uint8Array<ArrayBuffer>,
        });
    } catch (err) {
        throw new Error(`uploadImage(${debugLabel}): fetch error: ${err}`);
    }
    if (!res.ok) {
        try {
            const text = await res.text();

            throw new Error(
                `uploadImage(${debugLabel}): HTTP ${res.status} ${text}`
            );
        } catch {
            throw new Error(`uploadImage(${debugLabel}): HTTP ${res.status}`);
        }
    }
}
