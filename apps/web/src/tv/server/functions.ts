import { createServerFn } from '@tanstack/react-start';

import { cameraPositions, parsePatch, type CameraPosition } from '@/lib/tvDisplay';
import { socketUrl } from '~/apiUrl';
import { validGrid } from '~/tv/lib/cupFormation';
import { apiFor, ApiError, signup } from '~/tv/server/api';
import { removeGroup } from '~/tv/server/appRemote';
import { buildBoard } from '~/tv/server/board';
import { formationMatch } from '~/tv/server/cupFormation';
import {
    authorize,
    byGroup,
    cameraFor,
    register,
    setSession,
    signal,
    update,
    watch,
} from '~/tv/server/displays';
import { claimPhoneCamera } from '~/tv/server/phoneCamera';

// What the TV's and the camera's pages call. Phones change them through the app (appRemote.ts).

const asObject = (data: unknown) =>
    (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

/** a TV or camera announcing itself, on load and whenever its connection comes back */
export const registerDisplay = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const display = register({
            // TV pages from before cameras don't send it
            kind: data.kind === 'camera' ? 'camera' : 'tv',
            id: data.id,
            secret: data.secret,
            code: data.code,
            config: data.config,
            refreshToken: data.refreshToken,
        });
        if (display.kind === 'camera' && typeof data.pairingToken === 'string')
            await claimPhoneCamera(data.pairingToken, display);
        return { config: display.config, code: display.code, refreshToken: display.refreshToken };
    });

/**
 * what the TV shows right now; `key` is the TV's secret (named from when phones had keys, so
 * TV pages from before keep working)
 */
export const getBoard = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const display = authorize(data.id, data.key);
        if (!display.config.groupId || !display.refreshToken) return null;
        return buildBoard(display.refreshToken, display.config);
    });

/** the API's websocket, as browsers reach it */
export const getSocketUrl = createServerFn({ method: 'GET' }).handler(() => socketUrl());

/**
 * The TV asking its camera (`cameraFor`) for the video; the camera answers with an offer on the
 * TV's events. Null while the group has no camera on.
 */
export const watchCamera = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const tv = authorize(data.id, data.key);
        const position = cameraPositions.includes(data.position as CameraPosition)
            ? (data.position as CameraPosition)
            : 'main';
        const camera =
            tv.kind === 'tv' && ['auto', 'camera'].includes(tv.config.view)
                ? cameraFor(tv, position)
                : undefined;
        if (!camera) return null;
        watch(camera, tv, position);
        return camera.id;
    });

/** an offer or answer from a TV or camera (`id`, `key`) to the other end (`to`) */
export const sendSignal = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const from = authorize(data.id, data.key);
        const value = asObject(data.signal);
        const type = value.type;
        const sdp = value.sdp;
        if ((type !== 'offer' && type !== 'answer') || typeof sdp !== 'string') return false;
        if (sdp.length > 100_000) return false;
        return signal(from, data.to, { type, sdp });
    });

/** Camera-secret authorized snapshot; upgrades cameras paired before they had API users. */
export const getCameraMatches = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const camera = authorize(data.id, data.key);
        if (camera.kind !== 'camera' || !camera.config.groupId) return null;
        const groupId = camera.config.groupId;
        let refreshToken = camera.refreshToken;
        if (!refreshToken) {
            refreshToken = await signup(camera.id, 'camera');
            setSession(camera, refreshToken);
        }
        const api = apiFor(refreshToken);
        const matches = await api.liveMatches(groupId).catch(async (error: unknown) => {
            // Previously paired cameras have no membership yet. Retry a failed join on the next snapshot.
            if (
                !(error instanceof ApiError) ||
                error.httpCode !== 401 ||
                camera.config.groupId !== groupId
            )
                throw error;
            await api.join(groupId);
            if (camera.config.groupId !== groupId) {
                await api.leave(groupId);
                return [];
            }
            return api.liveMatches(groupId);
        });
        // A removal or re-pairing while the API request ran wins.
        if (camera.config.groupId !== groupId) return null;
        // Optional saved templates must not prevent the recording snapshot from succeeding.
        const saved = await api.formations(groupId).catch(async (error: unknown) => {
            const Sentry = await import('@sentry/node');
            Sentry.captureException(error, { tags: { operation: 'cup-formation-templates' } });
            return [];
        });
        const templates = saved.map((formation) => formation.cups).filter(validGrid);
        if (camera.config.groupId !== groupId) return null;
        return {
            groupId,
            name: camera.name,
            liveMatchIds: matches.map((m) => m.id),
            formations: matches.map((match) => formationMatch(match, templates)),
            tvs: byGroup(groupId).map((tv) => ({ id: tv.id, name: tv.name })),
        };
    });

/** Camera-local controls share the same settings as the app's remote. */
export const setCameraOrientation = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(({ data }) => {
        const camera = authorize(data.id, data.key);
        if (camera.kind !== 'camera') return;
        const patch = parsePatch(data);
        update(camera, {
            cameraRotation: patch.cameraRotation ?? camera.config.cameraRotation,
            cameraVideoFlipped: patch.cameraVideoFlipped ?? camera.config.cameraVideoFlipped,
        });
    });

export const stopCamera = createServerFn({ method: 'POST' })
    .inputValidator(asObject)
    .handler(async ({ data }) => {
        const camera = authorize(data.id, data.key);
        if (camera.kind === 'camera') await removeGroup(camera);
    });
