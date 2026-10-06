import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type DisplayConfig, emptyConfig, parseConfig } from '@/lib/tvDisplay';
import { useCameraSender } from '~/tv/lib/cameraFeed';
import { type DisplayEvent, randomToken, useDisplayEvents } from '~/tv/lib/hooks';
import { registerDisplay } from '~/tv/server/functions';

/**
 * A camera for Versus TV: a laptop (or a phone's browser) at the table films it, and the group's
 * TVs show the video with the score over it (the TV remote's Camera view). It's added in the app
 * with the code it shows, like a TV, and sends its video to the TVs itself (lib/cameraFeed.ts).
 */
export const Route = createFileRoute('/tv/camera')({
    // everything here depends on this browser's identity in localStorage
    ssr: false,
    component: Camera,
});

interface Identity {
    id: string;
    secret: string;
    /** what it shows to be added in the app; the server hands it out on the first register */
    code: string | null;
    /** only the group counts */
    config: DisplayConfig;
}

const STORAGE_KEY = 'versus-camera';
/** the camera picked on this device, if it has several */
const DEVICE_KEY = 'versus-camera-device';

function loadIdentity(): Identity {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '');
        if (stored?.id && stored?.secret) {
            return { ...stored, code: stored.code ?? null, config: parseConfig(stored.config) };
        }
    } catch {
        // first start, or something unreadable: start over
    }
    return { id: randomToken(), secret: randomToken(24), code: null, config: emptyConfig };
}

function Camera() {
    const [identity, setIdentity] = useState(loadIdentity);
    const [registered, setRegistered] = useState(false);
    const [deviceId, setDeviceId] = useState(() => localStorage.getItem(DEVICE_KEY));
    const media = useCamera(deviceId);
    const groupName = identity.config.groupId ? identity.config.groupName : null;
    const sender = useCameraSender(
        identity.id,
        identity.secret,
        media.stream,
        identity.config.groupId
    );
    useWakeLock();

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    }, [identity]);

    const register = useCallback(async () => {
        const { id, secret, code, config } = identity;
        const res = await registerDisplay({ data: { kind: 'camera', id, secret, code, config } });
        setIdentity((i) => ({ ...i, code: res.code, config: res.config }));
        setRegistered(true);
    }, [identity]);

    // registers once (until it works); the events stream registers again when it loses the server
    useEffect(() => {
        let stopped = false;
        const attempt = () =>
            register().catch(() => {
                if (!stopped) setTimeout(attempt, 3_000);
            });
        attempt();
        return () => {
            stopped = true;
        };
    }, []);

    const handlers = useRef(sender);
    handlers.current = sender;
    const onEvent = useCallback((event: DisplayEvent) => {
        if (event.type === 'reload') return location.reload();
        if (event.type === 'config') setIdentity((i) => ({ ...i, config: event.config }));
        if (event.type === 'watch') void handlers.current.onWatch(event.tvId);
        if (event.type === 'signal') void handlers.current.onSignal(event.from, event.signal);
    }, []);

    const connected = useDisplayEvents(
        registered ? identity.id : undefined,
        identity.secret,
        onEvent,
        register
    );

    const pickDevice = (id: string) => {
        localStorage.setItem(DEVICE_KEY, id);
        setDeviceId(id);
    };

    return (
        <main className="relative h-screen overflow-hidden bg-black text-text">
            {media.stream && <Preview stream={media.stream} />}
            {!groupName ? (
                <div className="absolute inset-0 grid place-items-center bg-black/60 p-6">
                    <div className="flex max-w-xl flex-col items-center gap-6 text-center">
                        <div className="text-sm font-semibold tracking-[0.3em] text-text-2">
                            VERSUS CAMERA
                        </div>
                        <h1 className="text-3xl leading-tight font-black sm:text-5xl">
                            Film your table for the TV
                        </h1>
                        <div className="tabular rounded-3xl bg-panel px-8 py-4 text-6xl leading-none font-black tracking-[0.2em] sm:text-8xl">
                            {identity.code ?? '······'}
                        </div>
                        <p className="text-lg text-text-2">
                            In the Versus app, open Settings → TV Remote → Add Camera and enter this
                            code.
                        </p>
                        <Problems error={media.error} offline={registered && !connected} />
                        {media.error && <RetryButton onPress={media.retry} />}
                    </div>
                </div>
            ) : (
                <>
                    <header
                        className="absolute top-0 right-0 left-0 flex items-start gap-4 p-5 pb-12"
                        style={{
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                        }}
                    >
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold tracking-[0.3em] text-text-2">
                                VERSUS CAMERA
                            </div>
                            <h1 className="truncate text-2xl font-black">{groupName}</h1>
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-panel/80 px-4 py-2 text-sm font-semibold">
                            {sender.watching > 0 ? (
                                <>
                                    <span className="live-dot size-2.5 rounded-full bg-live" />
                                    <span className="text-live">
                                        On {sender.watching} {sender.watching === 1 ? 'TV' : 'TVs'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-text-2">No TV shows it yet</span>
                            )}
                        </div>
                    </header>
                    <footer
                        className="absolute right-0 bottom-0 left-0 flex flex-wrap items-end gap-4 p-5 pt-12"
                        style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                        }}
                    >
                        <div className="min-w-0 flex-1 text-sm text-text-2">
                            <Problems error={media.error} offline={!connected} />
                            {media.error ? (
                                <RetryButton onPress={media.retry} />
                            ) : (
                                <p>
                                    To show it, choose Camera on a TV in the app&apos;s TV Remote.
                                    Keep this page open and the screen on.
                                </p>
                            )}
                        </div>
                        {media.devices.length > 1 && (
                            <select
                                value={
                                    deviceId ??
                                    media.stream?.getVideoTracks()[0]?.getSettings().deviceId ??
                                    ''
                                }
                                onChange={(e) => pickDevice(e.target.value)}
                                className="max-w-full rounded-xl bg-panel px-3 py-2 text-sm"
                            >
                                {media.devices.map((d, i) => (
                                    <option key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Camera ${i + 1}`}
                                    </option>
                                ))}
                            </select>
                        )}
                    </footer>
                </>
            )}
        </main>
    );
}

function Preview({ stream }: { stream: MediaStream }) {
    const video = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        video.current!.srcObject = stream;
    }, [stream]);
    return (
        <video
            ref={video}
            muted
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
        />
    );
}

function Problems({ error, offline }: { error: string | null; offline: boolean }) {
    return (
        <>
            {error && <p className="font-semibold text-red">{error}</p>}
            {offline && <p className="text-red">Reconnecting…</p>}
        </>
    );
}

function RetryButton({ onPress }: { onPress: () => void }) {
    return (
        <button
            type="button"
            onClick={onPress}
            className="mt-2 rounded-xl bg-panel-2 px-4 py-2 font-semibold text-text"
        >
            Try again
        </button>
    );
}

/** this device's camera (`deviceId`, or the one facing away), and the others it could use */
function useCamera(deviceId: string | null) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setStream(null);
        setError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("This browser can't use a camera here.");
            return;
        }
        let stopped = false;
        let started: MediaStream | undefined;
        navigator.mediaDevices
            .getUserMedia({
                audio: false,
                video: {
                    ...(deviceId
                        ? { deviceId: { ideal: deviceId } }
                        : { facingMode: { ideal: 'environment' } }),
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                },
            })
            .then(async (s) => {
                if (stopped) return s.getTracks().forEach((t) => t.stop());
                started = s;
                setStream(s);
                setError(null);
                const all = await navigator.mediaDevices.enumerateDevices();
                if (!stopped) setDevices(all.filter((d) => d.kind === 'videoinput'));
            })
            .catch((err: unknown) => {
                if (stopped) return;
                const name = err instanceof Error ? err.name : String(err);
                setError(
                    name === 'NotAllowedError'
                        ? 'Allow this page to use the camera, then try again.'
                        : `The camera didn't start (${name}).`
                );
            });
        return () => {
            stopped = true;
            started?.getTracks().forEach((t) => t.stop());
        };
    }, [deviceId, attempt]);

    return { stream, error, devices, retry: () => setAttempt((a) => a + 1) };
}

/** keeps the screen on, so the device doesn't sleep at the table */
function useWakeLock() {
    useEffect(() => {
        let lock: WakeLockSentinel | undefined;
        const request = () => {
            if (document.visibilityState !== 'visible') return;
            navigator.wakeLock
                ?.request('screen')
                .then((l) => (lock = l))
                .catch(() => {});
        };
        request();
        document.addEventListener('visibilitychange', request);
        return () => {
            document.removeEventListener('visibilitychange', request);
            void lock?.release();
        };
    }, []);
}
