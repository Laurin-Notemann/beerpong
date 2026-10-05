/**
 * Score clips reach the TV through this server: the bucket sends no CORS headers, so the TV
 * couldn't download them into memory itself (useClipCache). Only clips a board handed out are
 * served, by asset id, so a new upload (a new asset) gets a new path and is never mixed up with
 * the old one.
 */
const clipUrls = new Map<string, string>();

/** the path the TV loads this clip from */
export function clipPath(url: string | null | undefined) {
    if (!url) return null;
    const id = new URL(url).pathname.split('/').pop()!;
    clipUrls.set(id, url);
    return `/tv/api/clips/${encodeURIComponent(id)}`;
}

/** the clip, passed through with its range so a `<video>` can also stream it */
export async function clipResponse(id: string, range: string | null) {
    const url = clipUrls.get(id);
    if (!url) return new Response(null, { status: 404 });
    const res = await fetch(url, { headers: range ? { Range: range } : {} });
    const headers = new Headers({ 'Cache-Control': 'private, max-age=31536000, immutable' });
    for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
        const value = res.headers.get(name);
        if (value) headers.set(name, value);
    }
    return new Response(res.body, { status: res.status, headers });
}
