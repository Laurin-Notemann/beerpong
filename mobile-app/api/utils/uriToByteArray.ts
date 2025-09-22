import { ConsoleLogger } from '@/utils/logging';

export async function uriToByteArray(
    uri: string
): Promise<Uint8Array<ArrayBuffer>> {
    try {
        const resp = await fetch(uri);
        const buffer = await resp.arrayBuffer();
        const byteArray = new Uint8Array(buffer);

        return byteArray;
    } catch (err) {
        const message = (err as Error).message || 'Unknown';

        ConsoleLogger.error('uriToByteArray:', message, uri);

        throw new Error('uriToByteArray: ' + message);
    }
}
