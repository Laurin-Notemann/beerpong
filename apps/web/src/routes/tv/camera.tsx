import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type DisplayConfig, type CameraRotation, emptyConfig, parseConfig } from '@/lib/tvDisplay';
import { CameraVideo } from '~/tv/components/CameraVideo';
import { PlayingAreas } from '~/tv/components/PlayingAreas';
import { useCameraSender } from '~/tv/lib/cameraFeed';
import { useCameraMatches, useCameraRecording } from '~/tv/lib/cameraRecording';
import { validAreas, type PlayingArea } from '~/tv/lib/cupVision';
import { type DisplayEvent, randomToken, useDisplayEvents } from '~/tv/lib/hooks';
import { useCupDetector } from '~/tv/lib/useCupDetector';
import { useCupFormationSync } from '~/tv/lib/useCupFormationSync';
import { registerDisplay, setCameraOrientation, stopCamera } from '~/tv/server/functions';

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
    refreshToken: string | null;
    /** group, subject and video orientation, kept across reloads */
    config: DisplayConfig;
}

const STORAGE_KEY = 'versus-camera';
/** the camera picked on this device, if it has several */
const DEVICE_KEY = 'versus-camera-device';

function loadIdentity(): Identity {
    try {
        const stored = JSON.parse(
            localStorage.getItem(STORAGE_KEY) ?? ''
        ) as Partial<Identity> | null;
        if (stored?.id && stored?.secret) {
            return {
                id: stored.id,
                secret: stored.secret,
                refreshToken: stored.refreshToken ?? null,
                code: stored.code ?? null,
                config: parseConfig(stored.config),
            };
        }
    } catch {
        // first start, or something unreadable: start over
    }
    return {
        id: randomToken(),
        secret: randomToken(24),
        code: null,
        refreshToken: null,
        config: emptyConfig,
    };
}

function Camera() {
    const [identity, setIdentity] = useState(loadIdentity);
    const [pairingToken, setPairingToken] = useState(() =>
        new URLSearchParams(location.hash.slice(1)).get('pair')
    );
    const [pairingError, setPairingError] = useState<string | null>(null);
    const [capturing, setCapturing] = useState(true);
    const [registered, setRegistered] = useState(false);
    const [deviceId, setDeviceId] = useState(() => localStorage.getItem(DEVICE_KEY));
    const media = useCamera(deviceId, capturing);
    const previewVideo = useRef<HTMLVideoElement>(null);
    const [cupOutlines, setCupOutlines] = useState(
        () => localStorage.getItem('versus-cup-outlines') !== 'off'
    );
    const [selectingAreas, setSelectingAreas] = useState(false);
    const cameraDevice = media.stream
        ? media.stream.getVideoTracks()[0]?.getSettings().deviceId ||
          deviceId ||
          media.stream.getVideoTracks()[0]?.label ||
          'default-camera'
        : '';
    const [calibration, setCalibration] = useState<{ device: string; areas: PlayingArea[] } | null>(
        () => {
            try {
                const value = JSON.parse(
                    localStorage.getItem('versus-playing-areas') ?? 'null'
                ) as { device?: unknown; areas?: unknown } | null;
                return value && typeof value.device === 'string' && validAreas(value.areas)
                    ? { device: value.device, areas: value.areas }
                    : null;
            } catch {
                return null;
            }
        }
    );
    const areas = cameraDevice && calibration?.device === cameraDevice ? calibration.areas : null;
    const groupName = identity.config.groupId ? identity.config.groupName : null;
    const sender = useCameraSender(
        identity.id,
        identity.secret,
        media.stream,
        identity.config.groupId
    );
    const matches = useCameraMatches(
        identity.id,
        identity.secret,
        identity.config.groupId,
        registered
    );
    const [syncMatchId, setSyncMatchId] = useState('');
    const [firstTeam, setFirstTeam] = useState<'blue' | 'red'>('blue');
    const syncingMatch = matches?.formations?.find((m) => m.id === syncMatchId);
    const formationSync = useCupFormationSync(
        identity.id,
        identity.secret,
        cupOutlines && !selectingAreas ? syncingMatch : undefined,
        areas,
        firstTeam
    );
    const cupStatus = useCupDetector(
        previewVideo,
        cupOutlines,
        sender.sendCups,
        identity.id,
        identity.config.groupId,
        selectingAreas ? null : areas,
        formationSync.observe
    );
    if (syncMatchId && matches && !syncingMatch) setSyncMatchId('');
    const recording = useCameraRecording(
        identity.id,
        identity.secret,
        media.stream,
        identity.config.groupId,
        matches
    );
    useWakeLock();

    useEffect(() => {
        const receive = () => {
            const token = new URLSearchParams(location.hash.slice(1)).get('pair');
            if (!token) return;
            setPairingToken(token);
            setRegistered(false);
            setCapturing(true);
            history.replaceState(history.state, '', location.pathname + location.search);
        };
        // Browsers may reuse the open camera tab for another Use this phone handoff.
        if (pairingToken)
            history.replaceState(history.state, '', location.pathname + location.search);
        window.addEventListener('hashchange', receive);
        return () => window.removeEventListener('hashchange', receive);
    }, [pairingToken]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    }, [identity]);

    const register = useCallback(async () => {
        const { id, secret, code, config, refreshToken } = identity;
        const res = await registerDisplay({
            data: {
                kind: 'camera',
                id,
                secret,
                code,
                config,
                refreshToken,
                pairingToken: registered ? undefined : pairingToken,
            },
        });
        setIdentity((i) => ({
            ...i,
            code: res.code,
            config: res.config,
            refreshToken: res.refreshToken,
        }));
        setRegistered(true);
        setPairingError(null);
    }, [identity, pairingToken, registered]);

    const registerRef = useRef(register);
    useEffect(() => {
        registerRef.current = register;
    }, [register]);

    // registers once (until it works); the events stream registers again when it loses the server
    useEffect(() => {
        let stopped = false;
        const attempt = () => {
            void registerRef.current().catch((error: unknown) => {
                if (stopped) return;
                setPairingError(
                    error instanceof Error
                        ? error.message
                        : 'Could not pair this phone. Try again from TV Remote.'
                );
                if (!stopped) setTimeout(attempt, 3_000);
            });
        };
        attempt();
        return () => {
            stopped = true;
        };
    }, [pairingToken]);

    const handlers = useRef(sender);
    useEffect(() => {
        handlers.current = sender;
    }, [sender]);
    const onEvent = useCallback((event: DisplayEvent) => {
        if (event.type === 'reload') return location.reload();
        if (event.type === 'session')
            setIdentity((i) => ({ ...i, refreshToken: event.refreshToken }));
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

    const orientation = (rotation: CameraRotation) => {
        void setCameraOrientation({
            data: { id: identity.id, key: identity.secret, cameraRotation: rotation },
        }).catch(() => setPairingError('Could not rotate the camera. Try again.'));
    };
    const stop = () => {
        setCapturing(false);
        void stopCamera({ data: { id: identity.id, key: identity.secret } }).catch(() =>
            setPairingError('Could not remove the camera. Remove it in TV Remote.')
        );
    };

    return (
        <main className="relative h-screen overflow-hidden bg-black text-text">
            {media.stream && (
                <CameraVideo
                    stream={media.stream}
                    videoRef={previewVideo}
                    rotation={identity.config.cameraRotation}
                    cameraId={identity.id}
                    flipped={identity.config.cameraVideoFlipped}
                />
            )}
            {selectingAreas && (
                <PlayingAreas
                    video={previewVideo}
                    initial={areas}
                    cancel={() => setSelectingAreas(false)}
                    remove={() => {
                        localStorage.removeItem('versus-playing-areas');
                        setCalibration(null);
                        setSelectingAreas(false);
                    }}
                    save={(selected) => {
                        const value = { device: cameraDevice, areas: selected };
                        localStorage.setItem('versus-playing-areas', JSON.stringify(value));
                        setCalibration(value);
                        setSelectingAreas(false);
                    }}
                />
            )}
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
                        {pairingError && (
                            <p role="alert" className="text-red">
                                {pairingError}
                            </p>
                        )}
                        {!capturing && (
                            <p>
                                Camera stopped. Choose Use this phone in TV Remote to pair it again.
                            </p>
                        )}
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
                        {recording.recording && (
                            <div
                                role="status"
                                className="flex items-center gap-2 rounded-full bg-red px-4 py-2 text-sm font-bold text-white"
                            >
                                <span className="size-2.5 rounded-full bg-white" />
                                REC
                            </div>
                        )}
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
                            {pairingError && (
                                <p role="alert" className="text-red">
                                    {pairingError}
                                </p>
                            )}
                            <Problems error={media.error} offline={!connected} />
                            {recording.error && (
                                <p className="font-semibold text-red">{recording.error}</p>
                            )}
                            <button
                                type="button"
                                aria-pressed={cupOutlines}
                                className="min-h-11 rounded-xl bg-panel px-3 py-2 text-sm font-semibold"
                                onClick={() => {
                                    setCupOutlines((on) => {
                                        localStorage.setItem(
                                            'versus-cup-outlines',
                                            on ? 'off' : 'on'
                                        );
                                        return !on;
                                    });
                                }}
                            >
                                {cupOutlines
                                    ? 'Turn experimental outlines off'
                                    : 'Turn experimental outlines on'}
                            </button>
                            <button
                                type="button"
                                className="ml-3 min-h-11 rounded-xl bg-panel px-3 py-2 text-sm font-semibold"
                                disabled={!media.stream}
                                onClick={() => setSelectingAreas(true)}
                            >
                                {areas ? 'Adjust playing areas' : 'Select playing areas'}
                            </button>
                            <p role="status">{cupStatus}</p>
                            <label className="mt-2 block">
                                Sync formations to match
                                <select
                                    className="ml-2 min-h-11 rounded-xl bg-panel px-3 text-text"
                                    value={syncMatchId}
                                    disabled={!cupOutlines || !areas}
                                    onChange={(event) => setSyncMatchId(event.target.value)}
                                >
                                    <option value="">Off</option>
                                    {(matches?.formations ?? []).map((match, index) => (
                                        <option key={match.id} value={match.id}>
                                            Live match {index + 1} · {match.id.slice(0, 8)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {syncMatchId && (
                                <>
                                    <label className="block">
                                        Area 1 belongs to
                                        <select
                                            className="ml-2 min-h-11 rounded-xl bg-panel px-3 text-text"
                                            value={firstTeam}
                                            onChange={(event) =>
                                                setFirstTeam(event.target.value as 'blue' | 'red')
                                            }
                                        >
                                            <option value="blue">Blue team</option>
                                            <option value="red">Red team</option>
                                        </select>
                                    </label>
                                    <p role="status">{formationSync.status}</p>
                                    <p>
                                        Area 2 is the other team. Positions sync after staying
                                        stable; enter scores on your phone.
                                    </p>
                                </>
                            )}
                            <p>Live-match footage is saved to Versus storage while REC is shown.</p>
                            {recording.pending > 0 && (
                                <p>
                                    {recording.pending} recording{' '}
                                    {recording.pending === 1 ? 'segment' : 'segments'} waiting to
                                    upload. Keep this page open.
                                </p>
                            )}
                            {media.error ? (
                                <RetryButton onPress={media.retry} />
                            ) : (
                                <p>
                                    To show it, choose Camera on a TV in the app&apos;s TV Remote.
                                    Keep this page open and the screen on.
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                orientation(
                                    ((identity.config.cameraRotation + 90) % 360) as CameraRotation
                                )
                            }
                            className="min-h-11 rounded-xl bg-panel px-4 py-2 text-sm font-semibold"
                        >
                            Rotate 90°
                        </button>
                        <button
                            type="button"
                            onClick={stop}
                            className="min-h-11 rounded-xl bg-panel px-4 py-2 text-sm font-semibold"
                        >
                            Stop camera
                        </button>
                        {media.devices.length > 1 && (
                            <select
                                value={
                                    deviceId ??
                                    media.stream?.getVideoTracks()[0]?.getSettings().deviceId ??
                                    ''
                                }
                                onChange={(e) => pickDevice(e.target.value)}
                                aria-label="Camera lens"
                                className="min-h-11 max-w-full rounded-xl bg-panel px-3 py-2 text-sm"
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
function useCamera(deviceId: string | null, capturing: boolean) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [attempt, setAttempt] = useState(0);
    const [previousCamera, setPreviousCamera] = useState({ deviceId, attempt, capturing });
    if (
        previousCamera.deviceId !== deviceId ||
        previousCamera.attempt !== attempt ||
        previousCamera.capturing !== capturing
    ) {
        setPreviousCamera({ deviceId, attempt, capturing });
        setStream(null);
        setError(null);
    }

    useEffect(() => {
        if (!capturing || !navigator.mediaDevices?.getUserMedia) return;
        let stopped = false;
        let started: MediaStream | undefined;
        navigator.mediaDevices
            .getUserMedia({
                audio: false,
                video: {
                    ...(deviceId
                        ? { deviceId: { ideal: deviceId } }
                        : { facingMode: { ideal: 'environment' } }),
                    aspectRatio: { ideal: 16 / 9 },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                },
            })
            .then(async (s) => {
                if (stopped) return s.getTracks().forEach((t) => t.stop());
                started = s;
                for (const track of s.getVideoTracks())
                    track.addEventListener('ended', () => {
                        if (stopped) return;
                        setStream(null);
                        setError('Camera stopped. Try again to reconnect it.');
                    });
                setStream(s);
                setError(null);
                const all = await navigator.mediaDevices.enumerateDevices();
                if (!stopped) setDevices(all.filter((d) => d.kind === 'videoinput'));
            })
            .catch((err: unknown) => {
                if (stopped) return;
                const name = err instanceof Error ? err.name : String(err);
                void import('@sentry/browser').then((Sentry) =>
                    Sentry.captureMessage('Camera capture failed', {
                        level: 'warning',
                        tags: { feature: 'camera-capture' },
                        extra: { name },
                    })
                );
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
    }, [deviceId, attempt, capturing]);

    return {
        stream,
        error:
            typeof navigator.mediaDevices?.getUserMedia === 'function'
                ? error
                : "This browser can't use a camera here.",
        devices,
        retry: () => setAttempt((a) => a + 1),
    };
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
