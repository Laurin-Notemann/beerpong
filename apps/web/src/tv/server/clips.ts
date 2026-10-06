import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

/**
 * Score clips reach the TV through this server, by asset id, so a new upload (a new asset) gets a
 * new path and is never mixed up with the old one. The TV's player shows black for what phones
 * upload (QuickTime, the index at the end, turned by a rotation flag), so each clip is converted
 * once with ffmpeg (in the Docker image) into a plain MP4 the player can start right away: H.264
 * with AAC, upright, at most 1280 pixels and 30 fps, index first. Its first and last frame become
 * images (`?frame=first`, `?frame=last`) the TV covers the video with while its player starts and
 * stops. That starts when a board shows the player, so the clip is ready before they score.
 */
const clipUrls = new Map<string, string>();
const converted = new Map<string, Promise<string | null>>();
const dir = join(tmpdir(), 'versus-score-clips');

/** the path the TV loads this clip from; starts converting it, so it's ready when they score */
export function clipPath(url: string | null | undefined) {
    if (!url) return null;
    const id = new URL(url).pathname.split('/').pop()!;
    clipUrls.set(id, url);
    void convert(id);
    return `/tv/api/clips/${encodeURIComponent(id)}`;
}

/** the converted clip's file, or null if that failed (then the original is served) */
function convert(id: string) {
    let file = converted.get(id);
    if (!file) {
        file = convertOnce(id, clipUrls.get(id)!).catch((err) => {
            console.warn(`score clip ${id}: converting failed, serving the original`, err);
            // the board shows a new clip before the phone uploaded it (403 until then), so the
            // next board tries again
            converted.delete(id);
            return null;
        });
        converted.set(id, file);
    }
    return file;
}

async function convertOnce(id: string, url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await mkdir(dir, { recursive: true });
    const input = join(dir, `${id}.in`);
    const output = join(dir, `${id}.mp4`);
    await writeFile(input, Buffer.from(await res.arrayBuffer()));
    await promisify(execFile)('ffmpeg', [
        ...['-v', 'error', '-y', '-i', input, '-t', '10', '-map', '0:v:0', '-map', '0:a:0?'],
        ...[
            '-vf',
            'scale=min(iw\\,1280):min(ih\\,1280):force_original_aspect_ratio=decrease:force_divisible_by=2',
        ],
        // phones film at up to 120 fps, more than level 3.1 allows at this size
        ...['-fpsmax', '30'],
        ...['-c:v', 'libx264', '-profile:v', 'main', '-level', '3.1', '-pix_fmt', 'yuv420p'],
        ...['-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k'],
        ...['-movflags', '+faststart', '-f', 'mp4', output],
    ]);
    await promisify(execFile)('ffmpeg', [
        ...['-v', 'error', '-y', '-i', output],
        ...['-frames:v', '1', '-q:v', '4', frameOf(output, 'first')],
    ]);
    // every frame of the last half second, each overwriting the one before
    await promisify(execFile)('ffmpeg', [
        ...['-v', 'error', '-y', '-sseof', '-0.5', '-i', output],
        ...['-update', '1', '-q:v', '4', frameOf(output, 'last')],
    ]);
    return output;
}

const frameOf = (file: string, frame: 'first' | 'last') => file.replace(/\.mp4$/, `.${frame}.jpg`);

/** the clip, with ranges, so a `<video>` can also stream it; or its first or last frame */
export async function clipResponse(id: string, range: string | null, frame: string | null) {
    const url = clipUrls.get(id);
    if (!url) return new Response(null, { status: 404 });
    const headers = new Headers({ 'Cache-Control': 'private, max-age=31536000, immutable' });

    const file = await convert(id);
    if (frame) {
        if (!file || (frame !== 'first' && frame !== 'last')) {
            return new Response(null, { status: 404 });
        }
        headers.set('Content-Type', 'image/jpeg');
        return new Response(await readFile(frameOf(file, frame)), { headers });
    }
    if (!file) {
        const res = await fetch(url, { headers: range ? { Range: range } : {} });
        for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
            const value = res.headers.get(name);
            if (value) headers.set(name, value);
        }
        return new Response(res.body, { status: res.status, headers });
    }

    const bytes = await readFile(file);
    headers.set('Content-Type', 'video/mp4');
    headers.set('Accept-Ranges', 'bytes');
    const [, from, to] = /^bytes=(\d*)-(\d*)$/.exec(range ?? '') ?? [];
    if (from === undefined || (!from && !to)) {
        headers.set('Content-Length', String(bytes.length));
        return new Response(bytes, { headers });
    }
    // `bytes=-500` is the last 500 bytes
    const start = from ? Number(from) : Math.max(bytes.length - Number(to), 0);
    const end = from && to ? Math.min(Number(to), bytes.length - 1) : bytes.length - 1;
    if (start > end) {
        headers.set('Content-Range', `bytes */${bytes.length}`);
        return new Response(null, { status: 416, headers });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${bytes.length}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(bytes.subarray(start, end + 1), { status: 206, headers });
}
