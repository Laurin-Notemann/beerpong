import { useCallback, useEffect, useRef, useState } from 'react';

import type { Signal } from '~/tv/server/displays';
import { sendSignal, watchCamera } from '~/tv/server/functions';

/**
 * A camera's video reaches the TV over WebRTC, peer to peer: on the same Wi-Fi it never leaves
 * the room. The TV asks for it (`watchCamera`), the camera sends an offer, the TV answers; both
 * go through the TV server as `signal`s on the other one's events (server/displays.ts). Each
 * sends its whole description at once, with every address it found, rather than trickling them:
 * one message each way, and on a local network finding them takes a moment.
 *
 * The camera offers, so the TV's old browser (Chromium 63, without `addTransceiver`) only has
 * to answer. Only `iceConnectionState` tells whether it's connected there (`connectionState` is
 * Chromium 72).
 */

/** where a browser behind a router learns its public address */
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/** how often the TV asks again while it has no video, and how long connecting may take */
const RETRY_MS = 10_000;
/** how long a connection may be disconnected before it's given up */
const DISCONNECTED_MS = 5_000;
/**
 * how often the TV checks that video still comes in; a camera that closed or lost the Wi-Fi
 * only shows as disconnected after several seconds, the frozen picture would stay until then
 */
const STALL_CHECK_MS = 2_000;
/** the camera's bitrate at most, for bad Wi-Fi */
const MAX_BITRATE = 2_500_000;

export const webRtcSupported = () => typeof RTCPeerConnection !== 'undefined';

const isConnected = (pc: RTCPeerConnection) =>
    pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed';

/** resolves once the connection found its addresses, so they go in its description */
function gathered(pc: RTCPeerConnection) {
    return new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const timeout = setTimeout(resolve, 3_000);
        const done = () => {
            clearTimeout(timeout);
            resolve();
        };
        pc.onicecandidate = (e) => !e.candidate && done();
        pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && done();
    });
}

/**
 * Calls `onChange` when the connection comes up or goes for good: failed, closed, or
 * disconnected for longer than a moment.
 */
function followIce(pc: RTCPeerConnection, onChange: (state: 'up' | 'gone') => void) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    pc.oniceconnectionstatechange = () => {
        clearTimeout(timeout);
        const state = pc.iceConnectionState;
        if (isConnected(pc)) onChange('up');
        else if (state === 'failed' || state === 'closed') onChange('gone');
        else if (state === 'disconnected') {
            timeout = setTimeout(() => onChange('gone'), DISCONNECTED_MS);
        }
    };
}

/** reports a connection problem to Sentry (sentry.ts) */
function report(problem: string, err?: unknown) {
    void import('@sentry/browser').then((Sentry) =>
        Sentry.captureMessage(`camera feed: ${problem}${err ? ` (${err})` : ''}`, 'warning')
    );
}

/**
 * The TV's side: while `wanted`, asks for its camera's video until it comes and again when it
 * goes, or when a phone picks another `cameraId`. `onSignal` takes the camera's offers from the
 * TV's events. `stream` is set while connected.
 */
export function useCameraFeed(
    id: string,
    secret: string,
    wanted: boolean,
    groupId: string | null,
    cameraId: string | null
) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const pc = useRef<{ conn: RTCPeerConnection; at: number } | null>(null);
    const want = useRef(wanted);
    want.current = wanted;

    const close = useCallback(() => {
        const previous = pc.current;
        pc.current = null;
        previous?.conn.close();
        setStream(null);
    }, []);

    useEffect(() => {
        if (!wanted || !webRtcSupported()) return;
        const ask = () => {
            const current = pc.current;
            // connected, or still connecting
            if (current && (isConnected(current.conn) || Date.now() - current.at < RETRY_MS)) {
                return;
            }
            watchCamera({ data: { id, key: secret } }).catch(() => {});
        };
        ask();
        const timer = setInterval(ask, RETRY_MS);

        // two checks in a row without a new byte of video: the camera is gone
        let last: number | undefined;
        let stalled = 0;
        const watchdog = setInterval(async () => {
            const current = pc.current;
            if (!current || !isConnected(current.conn)) return;
            const bytes = await bytesReceived(current.conn);
            if (pc.current !== current) return;
            stalled = bytes !== undefined && bytes === last ? stalled + 1 : 0;
            last = bytes;
            if (stalled >= 2) close();
        }, STALL_CHECK_MS);

        return () => {
            clearInterval(timer);
            clearInterval(watchdog);
            close();
        };
    }, [id, secret, wanted, groupId, cameraId, close]);

    const onSignal = useCallback(
        async (from: string, signal: Signal) => {
            if (!want.current || signal.type !== 'offer' || !webRtcSupported()) return;
            close();
            const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            pc.current = { conn, at: Date.now() };
            let incoming: MediaStream | null = null;
            const mine = () => pc.current?.conn === conn;

            conn.ontrack = (e) => {
                incoming = e.streams[0] ?? new MediaStream([e.track]);
            };
            // browsers before `ontrack`
            (conn as { onaddstream?: (e: { stream: MediaStream }) => void }).onaddstream = (e) => {
                incoming ??= e.stream;
            };
            followIce(conn, (state) => {
                if (!mine()) return;
                if (state === 'up') setStream(incoming);
                else close();
            });
            try {
                await conn.setRemoteDescription(new RTCSessionDescription(signal));
                await conn.setLocalDescription(await conn.createAnswer());
                await gathered(conn);
                if (!mine()) return;
                const answer = conn.localDescription!;
                const accepted = await sendSignal({
                    data: {
                        id,
                        key: secret,
                        to: from,
                        signal: { type: answer.type, sdp: answer.sdp },
                    },
                });
                if (!accepted && mine()) close();
            } catch (err) {
                report('the TV could not answer', err);
                if (mine()) close();
            }
        },
        [id, secret, close]
    );

    return { stream, onSignal };
}

/**
 * The camera's side: sends `stream` to every TV that asks (`onWatch`, then the TV's answer in
 * `onSignal`), each over a connection of its own. A new stream (another camera picked) replaces
 * the picture on all of them; changing or removing `groupId` closes the group's connections.
 * `watching` counts the TVs it's connected to.
 */
export function useCameraSender(
    id: string,
    secret: string,
    stream: MediaStream | null,
    groupId: string | null
) {
    const pcs = useRef(new Map<string, RTCPeerConnection>());
    const [watching, setWatching] = useState(0);
    const latest = useRef(stream);
    latest.current = stream;

    const count = useCallback(
        () => setWatching([...pcs.current.values()].filter(isConnected).length),
        []
    );
    const closeAll = useCallback(() => {
        for (const pc of pcs.current.values()) pc.close();
        pcs.current.clear();
        count();
    }, [count]);

    useEffect(() => {
        const track = stream?.getVideoTracks()[0] ?? null;
        for (const pc of pcs.current.values()) {
            for (const sender of pc.getSenders()) void sender.replaceTrack(track).catch(() => {});
        }
    }, [stream]);

    useEffect(() => closeAll, [groupId, closeAll]);

    const onWatch = useCallback(
        async (tvId: string) => {
            const media = latest.current;
            // the TV asks again in a moment
            if (!media || !groupId) return;
            pcs.current.get(tvId)?.close();
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            pcs.current.set(tvId, pc);
            for (const track of media.getVideoTracks()) pc.addTrack(track, media);
            preferH264(pc);
            followIce(pc, (state) => {
                if (state === 'gone') {
                    pc.close();
                    if (pcs.current.get(tvId) === pc) pcs.current.delete(tvId);
                }
                count();
            });
            try {
                await pc.setLocalDescription(await pc.createOffer());
                await gathered(pc);
                if (pcs.current.get(tvId) !== pc) return;
                const offer = pc.localDescription!;
                const accepted = await sendSignal({
                    data: {
                        id,
                        key: secret,
                        to: tvId,
                        signal: { type: offer.type, sdp: offer.sdp },
                    },
                });
                if (!accepted) {
                    pc.close();
                    if (pcs.current.get(tvId) === pc) pcs.current.delete(tvId);
                    count();
                }
            } catch (err) {
                report('the camera could not offer', err);
                pc.close();
                if (pcs.current.get(tvId) === pc) pcs.current.delete(tvId);
            }
        },
        [id, secret, groupId, count]
    );

    const onSignal = useCallback(async (from: string, signal: Signal) => {
        const pc = pcs.current.get(from);
        if (!pc || signal.type !== 'answer' || pc.signalingState !== 'have-local-offer') return;
        try {
            await pc.setRemoteDescription(signal);
            await limitBitrate(pc);
        } catch (err) {
            report('the camera could not take the answer', err);
        }
    }, []);

    return { watching, onWatch, onSignal };
}

/** the video bytes the connection got so far; undefined where the browser doesn't say */
async function bytesReceived(pc: RTCPeerConnection) {
    let total: number | undefined;
    try {
        (await pc.getStats()).forEach((stat: { type: string; bytesReceived?: number }) => {
            if (stat.type === 'inbound-rtp' && typeof stat.bytesReceived === 'number') {
                total = (total ?? 0) + stat.bytesReceived;
            }
        });
    } catch {
        // stats it can't give: no watchdog
    }
    return total;
}

/** H.264 first: TVs decode it in hardware */
function preferH264(pc: RTCPeerConnection) {
    const codecs = RTCRtpReceiver.getCapabilities?.('video')?.codecs;
    const transceiver = pc.getTransceivers?.()[0];
    if (!codecs || !transceiver?.setCodecPreferences) return;
    const h264 = codecs.filter((c) => c.mimeType === 'video/H264');
    transceiver.setCodecPreferences([...h264, ...codecs.filter((c) => !h264.includes(c))]);
}

async function limitBitrate(pc: RTCPeerConnection) {
    for (const sender of pc.getSenders()) {
        const params = sender.getParameters();
        if (!params.encodings?.length) continue;
        params.encodings[0].maxBitrate = MAX_BITRATE;
        await sender.setParameters(params);
    }
}
