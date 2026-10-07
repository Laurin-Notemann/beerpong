const MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/apng',
    'image/avif',
    // score clips
    'video/mp4',
] as const;

const isValidMimeType = (
    mimeType: string
): mimeType is (typeof MIME_TYPES)[number] => {
    return MIME_TYPES.includes(mimeType as (typeof MIME_TYPES)[number]);
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
 * @param mimeType - an image type, e.g. "image/jpeg", "image/png", "image/webp", or "video/mp4"
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
 */
export async function uploadAsset(
    singleUploadUrl: string,
    byteArray: Uint8Array<ArrayBuffer | ArrayBufferLike>,
    debugLabel: string,
    mimeType: string
): Promise<void> {
    if (!isValidSingleUploadUrl(singleUploadUrl)) {
        throw new Error(
            `uploadAsset(${debugLabel}): invalid singleUploadUrl "${singleUploadUrl}"`
        );
    }
    if (!isValidByteArray(byteArray)) {
        throw new Error(`uploadAsset(${debugLabel}): invalid byteArray`);
    }
    if (!isValidMimeType(mimeType)) {
        throw new Error(
            `uploadAsset(${debugLabel}): invalid mimeType "${mimeType}"`
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
        throw new Error(
            `uploadAsset(${debugLabel}): fetch error: ${String(err)}`
        );
    }
    if (!res.ok) {
        // S3 says why in the body (e.g. <Code>SignatureDoesNotMatch</Code>)
        const body = await res.text().catch(() => '');
        throw new Error(
            `uploadAsset(${debugLabel}): HTTP ${res.status} ${body.slice(0, 1000)}`.trim()
        );
    }
}
