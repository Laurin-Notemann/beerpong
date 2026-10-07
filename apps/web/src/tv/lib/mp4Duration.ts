/**
 * Chrome's MediaRecorder writes fragmented MP4 whose header gives the movie no length (mvhd)
 * and its track only the first fragment's (tkhd, mdhd), so players that trust the header show
 * 0:00 or 0:03 and seek badly. fixMp4Duration writes the length of all fragments into those
 * fields in place (nothing moves, so indexes like mfra stay valid) and drops a fragment a crash
 * cut off. The video data is untouched; a file it doesn't recognise comes back as it was, with
 * no duration.
 */
export async function fixMp4Duration(
    blob: Blob
): Promise<{ blob: Blob; durationMs: number | null }> {
    try {
        return (
            fix(new Uint8Array(await blob.arrayBuffer()), blob.type) ?? { blob, durationMs: null }
        );
    } catch {
        return { blob, durationMs: null };
    }
}

interface Box {
    type: string;
    start: number;
    /** after the size and type */
    body: number;
    end: number;
}

function boxes(view: DataView, start: number, end: number) {
    const found: Box[] = [];
    let at = start;
    while (at + 8 <= end) {
        let size = view.getUint32(at);
        let body = at + 8;
        if (size === 1) {
            size = uint64(view, at + 8);
            body = at + 16;
        } else if (size === 0) {
            size = end - at;
        }
        // a box running past its parent is the part a crash cut off
        if (size < body - at || at + size > end) break;
        const type = String.fromCharCode(
            view.getUint8(at + 4),
            view.getUint8(at + 5),
            view.getUint8(at + 6),
            view.getUint8(at + 7)
        );
        found.push({ type, start: at, body, end: at + size });
        at += size;
    }
    return found;
}

function children(view: DataView, box: Box | undefined, type: string) {
    return box ? boxes(view, box.body, box.end).filter((b) => b.type === type) : [];
}

function child(view: DataView, box: Box | undefined, ...path: string[]) {
    let current = box;
    for (const type of path) current = children(view, current, type)[0];
    return current;
}

function uint64(view: DataView, at: number) {
    return view.getUint32(at) * 2 ** 32 + view.getUint32(at + 4);
}

function setUint64(view: DataView, at: number, value: number) {
    view.setUint32(at, Math.floor(value / 2 ** 32));
    view.setUint32(at + 4, value >>> 0);
}

const v1 = (view: DataView, box: Box) => view.getUint8(box.body) === 1;

/** mvhd and mdhd: version and flags, creation and modification time, timescale, duration */
const timescaleOf = (view: DataView, box: Box) =>
    view.getUint32(box.body + (v1(view, box) ? 20 : 12));

/** tkhd: version and flags, creation and modification time, track id, reserved, duration */
const trackIdOf = (view: DataView, tkhd: Box) =>
    view.getUint32(tkhd.body + (v1(view, tkhd) ? 20 : 12));

function setDuration(view: DataView, box: Box, value: number) {
    const long = v1(view, box);
    const at =
        box.body +
        (box.type === 'mehd' ? 4 : box.type === 'tkhd' ? (long ? 28 : 20) : long ? 24 : 16);
    if (long) setUint64(view, at, value);
    else view.setUint32(at, Math.min(value, 0xffffffff));
}

/** a traf's first decode time and the one after its last sample, in its track's timescale */
function trafSpan(view: DataView, traf: Box, defaults: Map<number, number>) {
    const tfhd = child(view, traf, 'tfhd');
    const tfdt = child(view, traf, 'tfdt');
    if (!tfhd || !tfdt) return null;
    const flags = view.getUint32(tfhd.body) & 0xffffff;
    const track = view.getUint32(tfhd.body + 4);
    // optional fields: base data offset, sample description index, default sample duration
    const defaultAt = tfhd.body + 8 + (flags & 0x1 ? 8 : 0) + (flags & 0x2 ? 4 : 0);
    const fallback = flags & 0x8 ? view.getUint32(defaultAt) : defaults.get(track);
    const start = v1(view, tfdt) ? uint64(view, tfdt.body + 4) : view.getUint32(tfdt.body + 4);
    let end = start;
    for (const trun of children(view, traf, 'trun')) {
        const runFlags = view.getUint32(trun.body) & 0xffffff;
        const count = view.getUint32(trun.body + 4);
        // optional data offset and first sample flags, then per sample: duration, size, flags, offset
        const first = trun.body + 8 + (runFlags & 0x1 ? 4 : 0) + (runFlags & 0x4 ? 4 : 0);
        const entry = 4 * [0x100, 0x200, 0x400, 0x800].filter((bit) => runFlags & bit).length;
        if (runFlags & 0x100) {
            for (let i = 0; i < count; i++) end += view.getUint32(first + i * entry);
        } else if (fallback !== undefined) {
            end += count * fallback;
        } else {
            return null;
        }
    }
    return { track, start, end };
}

function fix(bytes: Uint8Array<ArrayBuffer>, type: string) {
    const view = new DataView(bytes.buffer);
    const top = boxes(view, 0, bytes.length);
    // a fragment whose media data a crash cut off
    while (top[top.length - 1]?.type === 'moof') top.pop();
    const moov = top.find((b) => b.type === 'moov');
    const mvhd = child(view, moov, 'mvhd');
    const mvex = child(view, moov, 'mvex');
    if (!moov || !mvhd || !mvex) return null;
    const defaults = new Map<number, number>();
    for (const trex of children(view, mvex, 'trex')) {
        defaults.set(view.getUint32(trex.body + 4), view.getUint32(trex.body + 12));
    }

    const spans = new Map<number, { start: number; end: number }>();
    for (const moof of top.filter((b) => b.type === 'moof')) {
        for (const traf of children(view, moof, 'traf')) {
            const span = trafSpan(view, traf, defaults);
            if (!span) return null;
            const known = spans.get(span.track);
            spans.set(span.track, {
                start: Math.min(known?.start ?? span.start, span.start),
                end: Math.max(known?.end ?? span.end, span.end),
            });
        }
    }
    if (!spans.size) return null;

    const movieScale = timescaleOf(view, mvhd);
    let movie = 0;
    for (const trak of children(view, moov, 'trak')) {
        const tkhd = child(view, trak, 'tkhd');
        const mdhd = child(view, trak, 'mdia', 'mdhd');
        if (!tkhd || !mdhd) return null;
        const span = spans.get(trackIdOf(view, tkhd));
        if (!span) continue;
        const media = span.end - span.start;
        const inMovie = Math.round((media * movieScale) / timescaleOf(view, mdhd));
        setDuration(view, mdhd, media);
        setDuration(view, tkhd, inMovie);
        movie = Math.max(movie, inMovie);
    }
    setDuration(view, mvhd, movie);
    const mehd = child(view, mvex, 'mehd');
    if (mehd) setDuration(view, mehd, movie);
    return {
        blob: new Blob([bytes.subarray(0, top[top.length - 1].end)], { type }),
        durationMs: (movie * 1000) / movieScale,
    };
}
