/**
 * Telemetry for the camera's video on its way to a TV (cameraFeed.ts), to tell why the TV's
 * picture stalls: the camera's network or encoder, its recording uploads (cameraRecording.ts), or
 * the TV itself. Both ends sample their connection's stats every 5 s and send them to Sentry Logs
 * as `camera feed stats` (attributes `side` and `cameraId`, the same id on both ends). The TV adds
 * what happens to its player (`camera feed note: …`), the camera each upload (`camera recording
 * upload started` / `finished`) and how long one ran in each sample (`uploadMs`).
 *
 * An end that sees trouble reports one Sentry event (tags `camera` and `side`) with its last
 * minute of samples: the TV when its video freezes, the camera when the TV asks for a keyframe or
 * its encoder falls behind. The TV's other camera warnings carry the same (`feedEventContext`).
 *
 * Browsers name different stats: the TV's Chromium 63 has no framesPerSecond, freezes or quality
 * limits, and its frame counts are on `track` stats. Whatever a browser lacks is left out.
 */

type Value = string | number | boolean;
type Fields = Record<string, Value>;
type Stat = { type: string; id?: string; [key: string]: unknown };

const SAMPLE_MS = 5_000;
/** samples and notes an event carries: about a minute */
const KEEP = 12;
/** a new connection starts slow and low; its first seconds don't count as trouble */
const SETTLE_MS = 15_000;
/** at most one event per connection in this long */
const REPORT_EVERY_MS = 60_000;
/** the same note is logged once in this long */
const NOTE_EVERY_MS = 5_000;
/** the camera films at 30 fps; less than this decoded over a sample is a frozen picture */
const FROZEN_FPS = 5;

const sentry = () => import('@sentry/browser');

function log(message: string, fields: Fields) {
    void sentry()
        .then((Sentry) => Sentry.logger.info(message, fields))
        .catch(() => {});
}

const clock = () => new Date().toISOString().slice(11, 23);

/** drops what a browser didn't give, rounds the rest for reading */
function compact(fields: Record<string, Value | undefined>) {
    const out: Fields = {};
    for (const key of Object.keys(fields)) {
        const value = fields[key];
        if (typeof value === 'number') {
            if (isFinite(value)) out[key] = Math.round(value * 10) / 10;
        } else if (value !== undefined) out[key] = value;
    }
    return out;
}

const line = (fields: Fields) =>
    `${clock()} ${Object.keys(fields)
        .map((key) => `${key}=${fields[key]}`)
        .join(' ')}`;

const kindOf = (s: Stat) => s.kind ?? s.mediaType;
const rtpOf = (stats: Stat[], type: string) =>
    stats.filter((s) => s.type === type && !s.isRemote && kindOf(s) !== 'audio');

/** the first number `key` has among `stats`, scaled */
function num(stats: (Stat | undefined)[], key: string, scale = 1) {
    for (const s of stats) {
        const value = s?.[key];
        if (typeof value === 'number') return value * scale;
    }
    return undefined;
}

function str(stats: Stat[], key: string) {
    for (const s of stats) if (typeof s[key] === 'string') return s[key] as string;
    return undefined;
}

function selectedPair(stats: Stat[]) {
    const transport = stats.find((s) => s.type === 'transport' && s.selectedCandidatePairId);
    return (
        stats.find(
            (s) => s.type === 'candidate-pair' && s.id === transport?.selectedCandidatePairId
        ) ??
        stats.find(
            (s) =>
                s.type === 'candidate-pair' &&
                s.state === 'succeeded' &&
                (s.nominated || s.selected)
        )
    );
}

/** turns the stats' running totals into what changed since the last sample, and per second */
function differ(start: number) {
    let at = start;
    let last: Record<string, number> = {};
    return (now: number, totals: Record<string, number | undefined>) => {
        const seconds = (now - at) / 1000;
        const before = last;
        at = now;
        last = {};
        for (const key of Object.keys(totals)) {
            const value = totals[key];
            if (value !== undefined) last[key] = value;
        }
        const delta = (key: string) =>
            last[key] === undefined ? undefined : last[key] - (before[key] ?? 0);
        const rate = (key: string, scale = 1) => {
            const change = delta(key);
            return change === undefined || seconds <= 0 ? undefined : (change * scale) / seconds;
        };
        return { delta, rate };
    };
}

/** the camera's recording uploads, to line them up with its samples */
const uploads: { start: number; end?: number; at: string }[] = [];

/** logs an upload's start; call what it returns when it ends */
export function startUpload(cameraId: string, fields: Fields) {
    const upload: (typeof uploads)[number] = { start: performance.now(), at: clock() };
    uploads.push(upload);
    if (uploads.length > KEEP) uploads.shift();
    const startedAt = new Date().toISOString();
    log('camera recording upload started', { side: 'camera', cameraId, ...fields });
    return (result: Record<string, Value | undefined>) => {
        upload.end = performance.now();
        log('camera recording upload finished', {
            side: 'camera',
            cameraId,
            startedAt,
            durationMs: Math.round(upload.end - upload.start),
            ...fields,
            ...compact(result),
        });
    };
}

/** how long an upload ran between `from` and `to` */
function uploadingMs(from: number, to: number) {
    let total = 0;
    for (const u of uploads)
        total += Math.max(0, Math.min(u.end ?? to, to) - Math.max(u.start, from));
    return total;
}

function cameraSample(stats: Stat[], diff: ReturnType<typeof differ>, now: number) {
    const rtp = rtpOf(stats, 'outbound-rtp');
    const remote = stats.filter((s) => s.type === 'remote-inbound-rtp' && kindOf(s) !== 'audio');
    const source = stats.filter((s) => s.type === 'media-source' && kindOf(s) !== 'audio');
    const pair = selectedPair(stats);
    const limits = rtp.find((s) => typeof s.qualityLimitationDurations === 'object')
        ?.qualityLimitationDurations as Record<string, number> | undefined;
    const { delta, rate } = diff(now, {
        bytesSent: num(rtp, 'bytesSent'),
        framesEncoded: num(rtp, 'framesEncoded'),
        nackCount: num(rtp, 'nackCount'),
        pliCount: num(rtp, 'pliCount'),
        firCount: num(rtp, 'firCount'),
        retransmittedPacketsSent: num(rtp, 'retransmittedPacketsSent'),
        keyFramesEncoded: num(rtp, 'keyFramesEncoded'),
        remotePacketsLost: num(remote, 'packetsLost'),
        limitedCpu: limits?.cpu,
        limitedBandwidth: limits?.bandwidth,
    });
    return compact({
        fps: num(rtp, 'framesPerSecond'),
        encodedFps: rate('framesEncoded'),
        captureFps: num(source, 'framesPerSecond'),
        width: num(rtp, 'frameWidth'),
        height: num(rtp, 'frameHeight'),
        sentKbps: rate('bytesSent', 8 / 1000),
        targetKbps: num(rtp, 'targetBitrate', 1 / 1000),
        availableOutKbps: num([pair], 'availableOutgoingBitrate', 1 / 1000),
        rttMs: num([pair], 'currentRoundTripTime', 1000),
        qualityLimit: str(rtp, 'qualityLimitationReason'),
        limitedCpuS: delta('limitedCpu'),
        limitedBandwidthS: delta('limitedBandwidth'),
        nacks: delta('nackCount'),
        plis: delta('pliCount'),
        firs: delta('firCount'),
        retransmits: delta('retransmittedPacketsSent'),
        keyFrames: delta('keyFramesEncoded'),
        remoteLost: delta('remotePacketsLost'),
        remoteLossPct: num(remote, 'fractionLost', 100),
        encoder: str(rtp, 'encoderImplementation'),
    });
}

function tvSample(stats: Stat[], diff: ReturnType<typeof differ>, now: number) {
    // Chromium 63 counts frames on the remote `track`; newer browsers on inbound-rtp.
    const rtp = [
        ...rtpOf(stats, 'inbound-rtp'),
        ...stats.filter((s) => s.type === 'track' && s.remoteSource && kindOf(s) !== 'audio'),
    ];
    const pair = selectedPair(stats);
    const player = tvVideo;
    const quality = player?.getVideoPlaybackQuality?.();
    const { delta, rate } = diff(now, {
        bytesReceived: num(rtp, 'bytesReceived'),
        framesDecoded: num(rtp, 'framesDecoded'),
        framesReceived: num(rtp, 'framesReceived'),
        framesDropped: num(rtp, 'framesDropped'),
        packetsLost: num(rtp, 'packetsLost'),
        nackCount: num(rtp, 'nackCount'),
        pliCount: num(rtp, 'pliCount'),
        firCount: num(rtp, 'firCount'),
        freezeCount: num(rtp, 'freezeCount'),
        totalFreezesDuration: num(rtp, 'totalFreezesDuration'),
        keyFramesDecoded: num(rtp, 'keyFramesDecoded'),
        jitterBufferDelay: num(rtp, 'jitterBufferDelay'),
        jitterBufferEmittedCount: num(rtp, 'jitterBufferEmittedCount'),
        videoFrames: quality?.totalVideoFrames,
    });
    const emitted = delta('jitterBufferEmittedCount');
    return compact({
        fps: num(rtp, 'framesPerSecond'),
        decodedFps: rate('framesDecoded'),
        receivedFps: rate('framesReceived'),
        videoFps: rate('videoFrames'),
        width: num(rtp, 'frameWidth'),
        height: num(rtp, 'frameHeight'),
        recvKbps: rate('bytesReceived', 8 / 1000),
        rttMs: num([pair], 'currentRoundTripTime', 1000),
        jitterMs: num(rtp, 'jitter', 1000),
        jitterBufferMs: emitted ? ((delta('jitterBufferDelay') ?? 0) / emitted) * 1000 : undefined,
        framesDropped: delta('framesDropped'),
        packetsLost: delta('packetsLost'),
        nacks: delta('nackCount'),
        plis: delta('pliCount'),
        firs: delta('firCount'),
        freezes: delta('freezeCount'),
        freezeMs: (delta('totalFreezesDuration') ?? NaN) * 1000,
        keyFrames: delta('keyFramesDecoded'),
        decoder: str(rtp, 'decoderImplementation'),
        readyState: player?.readyState,
        paused: player?.paused,
    });
}

interface Feed {
    side: 'camera' | 'tv';
    cameraId: string;
    tvId: string;
    samples: string[];
    notes: string[];
    /** notes since the last sample */
    pending: string[];
    logged: Record<string, number>;
}

/** the TV's feed, which its player's notes and warnings belong to */
let tvFeed: Feed | undefined;
/** the element the TV plays the feed in (CameraVideo) */
let tvVideo: HTMLVideoElement | null = null;

export function setFeedVideo(element: HTMLVideoElement | null) {
    tvVideo = element;
}

/**
 * Samples `pc` every 5 s until it's closed, from the camera's or the TV's `side`. The ids are
 * the camera's and the TV's display ids.
 */
export function watchFeedStats(
    pc: RTCPeerConnection,
    side: Feed['side'],
    cameraId: string,
    tvId: string
) {
    const start = performance.now();
    const diff = differ(start);
    const feed: Feed = { side, cameraId, tvId, samples: [], notes: [], pending: [], logged: {} };
    if (side === 'tv') tvFeed = feed;
    void sentry()
        .then((Sentry) => Sentry.setTag('camera', cameraId))
        .catch(() => {});
    let sampledAt = start;
    let reportedAt = -Infinity;
    let decoded = false;
    let busy = false;

    const report = (message: string, reasons: string[]) => {
        const now = performance.now();
        if (now - reportedAt < REPORT_EVERY_MS) return;
        reportedAt = now;
        const { tags, extra } = contextOf(feed);
        const recent = side === 'camera' ? { uploads: uploads.map(describeUpload) } : {};
        void sentry()
            .then((Sentry) =>
                Sentry.captureMessage(message, {
                    level: 'warning',
                    tags: { operation: 'camera-feed', ...tags },
                    extra: { reasons: reasons.join(', '), ...extra, ...recent },
                })
            )
            .catch(() => {});
    };

    const sample = async () => {
        if (pc.signalingState === 'closed') return stop();
        if (busy) return;
        busy = true;
        try {
            const stats: Stat[] = [];
            (await pc.getStats()).forEach((s: Stat) => stats.push(s));
            const now = performance.now();
            const fields =
                side === 'camera'
                    ? {
                          ...cameraSample(stats, diff, now),
                          uploadMs: Math.round(uploadingMs(sampledAt, now)),
                      }
                    : tvSample(stats, diff, now);
            sampledAt = now;
            const ice = pc.iceConnectionState;
            const notes = feed.pending.splice(0).join(', ');
            const all: Fields = { ice, ...fields, ...(notes ? { notes } : {}) };
            feed.samples.push(line(all));
            if (feed.samples.length > KEEP) feed.samples.shift();
            log('camera feed stats', { side, cameraId, tvId, ...all });

            const settled = now - start > SETTLE_MS && (ice === 'connected' || ice === 'completed');
            if (side === 'tv') {
                const fps = fields.decodedFps ?? fields.videoFps;
                if (typeof fps !== 'number') return;
                // only while the camera is on screen (CameraVideo): elsewhere nothing waits for it
                const shown = !!tvVideo && !document.hidden;
                if (settled && shown && decoded && fps < FROZEN_FPS) {
                    report('camera feed: TV video froze', [`${fps} fps decoded`]);
                }
                decoded ||= fps > 0;
            } else if (settled) {
                const reasons: string[] = [];
                if (Number(fields.plis ?? 0) + Number(fields.firs ?? 0) > 0)
                    reasons.push('the TV asked for a keyframe');
                if (fields.qualityLimit === 'cpu') reasons.push('encoder limited by CPU');
                if (typeof fields.fps === 'number' && fields.fps < 10)
                    reasons.push('low frame rate');
                if (reasons.length) report('camera feed: sender trouble', reasons);
            }
        } catch {
            // a browser without these stats: nothing to sample
        } finally {
            busy = false;
        }
    };
    const timer = setInterval(() => void sample(), SAMPLE_MS);
    const stop = () => {
        clearInterval(timer);
        if (tvFeed === feed) tvFeed = undefined;
    };
    return stop;
}

function describeUpload(u: (typeof uploads)[number]) {
    return `${u.at} ${u.end === undefined ? 'running' : `${Math.round(u.end - u.start)} ms`}`;
}

function contextOf(feed: Feed) {
    return {
        tags: { camera: feed.cameraId, tv: feed.tvId, side: feed.side },
        extra: { stats: feed.samples.slice(), notes: feed.notes.slice() },
    };
}

/** the TV feed's tags and last minute, for the TV's other camera warnings */
export function feedEventContext() {
    return tvFeed ? contextOf(tvFeed) : { tags: {}, extra: {} };
}

/**
 * Notes what happens to the TV's player (its events, recovery, score clips over it) in the next
 * sample and in Sentry Logs, while the TV shows a camera.
 */
export function noteFeed(note: string, fields: Fields = {}) {
    const feed = tvFeed;
    if (!feed) return;
    if (!feed.pending.includes(note)) feed.pending.push(note);
    feed.notes.push(`${clock()} ${note}`);
    if (feed.notes.length > KEEP * 2) feed.notes.shift();
    const now = performance.now();
    if (now - (feed.logged[note] ?? -Infinity) < NOTE_EVERY_MS) return;
    feed.logged[note] = now;
    log(`camera feed note: ${note}`, {
        side: feed.side,
        cameraId: feed.cameraId,
        tvId: feed.tvId,
        note,
        ...fields,
    });
}
