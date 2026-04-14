const bucket = process.env.APP_AWS_BUCKET;
const endpoint = process.env.APP_AWS_ENDPOINT;

export function getAssetUrl(assetId: string | undefined): string | null {
    return !assetId ? null : `https://${bucket}.${endpoint}/${assetId}`;
}
