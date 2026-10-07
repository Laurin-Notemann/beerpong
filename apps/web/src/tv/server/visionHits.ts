import { createServerFn } from '@tanstack/react-start';

import type { VisionHitCreateDto, VisionHitFeedbackDto } from '@/openapi/openapi';
import { validAreas } from '~/tv/lib/cupVision';
import { apiFor, ApiError } from '~/tv/server/api';
import { mappedFirstTeam } from '~/tv/server/cameraVision';
import { formationMatch } from '~/tv/server/cupFormation';
import { authorize, DisplayError } from '~/tv/server/displays';

const object = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
const uuid = (v: unknown): v is string =>
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const bounded = (v: unknown, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;

/** The camera may propose recognition only for the exact recording session, fresh clock
 * snapshot, match sequence and calibrated mapping it observed. Persistence belongs to Go. */
export const proposeCameraHit = createServerFn({ method: 'POST' })
    .inputValidator(object)
    .handler(async ({ data }) => {
        const camera = authorize(data.id, data.key);
        const groupId = camera.config.groupId;
        if (camera.kind !== 'camera' || !groupId || !camera.refreshToken)
            throw new DisplayError('cameraNotPaired', 403);
        const body = data.hit as VisionHitCreateDto;
        const image = object(body?.imageCup),
            evidence = object(body?.evidence);
        if (
            !body ||
            JSON.stringify(body).length > 4096 ||
            !uuid(data.hitId) ||
            !uuid(body.sessionId) ||
            !uuid(body.liveMatchId) ||
            body.cameraId !== camera.id ||
            typeof body.model !== 'string' ||
            body.model.length > 100 ||
            !bounded(body.confidence, 1) ||
            !bounded(image.x, 1) ||
            !bounded(image.y, 1) ||
            !bounded(image.radius, 0.5) ||
            !bounded(evidence.approachDistance, 10) ||
            !bounded(evidence.rimDistance, 10) ||
            !bounded(evidence.speed, 100) ||
            !Number.isSafeInteger(evidence.observations) ||
            !bounded(evidence.observations, 1000) ||
            typeof evidence.occluded !== 'boolean' ||
            typeof evidence.exitObserved !== 'boolean' ||
            !validAreas(data.areas) ||
            (data.ballColor !== undefined &&
                data.ballColor !== 'orange' &&
                data.ballColor !== 'white' &&
                data.ballColor !== 'both') ||
            !Number.isSafeInteger(data.seq) ||
            body.expectedSeq !== data.seq ||
            !bounded(data.clockUncertaintyMs, 2000) ||
            !Number.isFinite(data.receivedAt)
        )
            throw new DisplayError('invalidHitProposal');
        const api = apiFor(camera.refreshToken);
        if (data.retry === true) {
            const saved = await api.visionHit(groupId, data.hitId).catch((error: unknown) => {
                if (error instanceof ApiError && error.httpCode === 404) return null;
                throw error;
            });
            if (saved) {
                const immutable = (value: VisionHitCreateDto) =>
                    JSON.stringify([
                        value.liveMatchId,
                        value.expectedSeq ?? null,
                        value.cameraId,
                        value.sessionId,
                        value.model,
                        Date.parse(value.occurredAt),
                        Date.parse(value.cameraOccurredAt),
                        value.team,
                        value.cup ? [value.cup.x, value.cup.y] : null,
                        [value.imageCup.x, value.imageCup.y, value.imageCup.radius],
                        value.confidence,
                        [
                            value.evidence.approachDistance,
                            value.evidence.rimDistance,
                            value.evidence.speed,
                            value.evidence.observations,
                            value.evidence.occluded,
                            value.evidence.exitObserved,
                        ],
                    ]);
                if (immutable(saved) !== immutable(body))
                    throw new DisplayError('cameraHitConflict', 409);
                return saved;
            }
        }
        const snapshot = camera.cameraSnapshots?.find(
            (s) => s.id === data.snapshotId && s.groupId === groupId
        );
        if (
            !snapshot ||
            Date.now() - snapshot.serverAt > 20_000 ||
            !snapshot.matches.some((m) => m.id === body.liveMatchId && m.seq === data.seq)
        )
            throw new DisplayError('cameraSnapshotStale', 409);
        const rawAt = Date.parse(body.cameraOccurredAt),
            serverAt = Date.parse(body.occurredAt);
        const corrected = rawAt - Number(data.receivedAt) + snapshot.serverAt;
        if (
            !Number.isFinite(rawAt) ||
            !Number.isFinite(serverAt) ||
            Math.abs(corrected - serverAt) > 2 ||
            Math.abs(Date.now() - serverAt) > 20_000
        )
            throw new DisplayError('cameraClockStale', 409);
        const mappingCurrent = () => {
            const report = camera.vision;
            if (
                !report ||
                Date.now() - report.reportedAt > 15_000 ||
                report.command ||
                camera.config.groupId !== groupId
            )
                return false;
            const state = report.state;
            return (
                state.enabled &&
                state.ballEnabled &&
                (state.ballColor ?? 'both') === (data.ballColor ?? 'both') &&
                state.recording &&
                !state.selectingAreas &&
                state.device === data.device &&
                state.recordingSessionId === body.sessionId &&
                (state.hitMatchId ?? state.syncMatchId) === body.liveMatchId &&
                state.firstTeam === data.firstTeam &&
                (state.syncTvId ?? '') === data.syncTvId &&
                JSON.stringify(state.areas) === JSON.stringify(data.areas) &&
                mappedFirstTeam(camera, state) === data.firstTeam &&
                state.matches.some((m) => m.id === body.liveMatchId && m.seq === data.seq)
            );
        };
        if (!mappingCurrent()) throw new DisplayError('cameraMappingStale', 409);
        const areaIndex =
            body.team === data.firstTeam ? 0 : body.team === 'blue' || body.team === 'red' ? 1 : -1;
        if (areaIndex < 0) throw new DisplayError('invalidHitProposal');
        // Search-area extension is bounded by the same membership boundary as camera detection.
        const { cupSearchAreas } = await import('~/tv/lib/cupMembership');
        const area = cupSearchAreas(data.areas)[areaIndex];
        if (
            body.imageCup.x < area.x ||
            body.imageCup.x > area.x + area.width ||
            body.imageCup.y < area.y ||
            body.imageCup.y > area.y + area.height
        )
            throw new DisplayError('cameraHitOutsideArea', 409);
        const match = (await api.liveMatches(groupId)).find((m) => m.id === body.liveMatchId);
        if (!match || (match.lastSeq ?? 0) !== data.seq || !mappingCurrent())
            throw new DisplayError('cameraMatchStale', 409);
        if (
            body.cup &&
            !formationMatch(match)[body.team].some(
                (s) => s.cup.x === body.cup?.x && s.cup.y === body.cup?.y
            )
        )
            throw new DisplayError('cameraCupNoLongerStanding', 409);
        const hit = await api.createVisionHit(groupId, data.hitId, body);
        const Sentry = await import('@sentry/node');
        Sentry.logger.info('camera hit proposal persisted', {
            cameraId: camera.id,
            hitId: hit.id,
            matchId: hit.liveMatchId,
            sessionId: hit.sessionId,
            model: hit.model,
            latencyMs: Date.now() - serverAt,
            cupIdentity: hit.cup ? 'mapped' : 'unknown',
        });
        return hit;
    });

export const getDisplayVisionHits = createServerFn({ method: 'POST' })
    .inputValidator(object)
    .handler(async ({ data }) => {
        const display = authorize(data.id, data.key);
        if (!display.config.groupId || !display.refreshToken) return [];
        return apiFor(display.refreshToken).visionHits(display.config.groupId, {
            liveMatchId: typeof data.liveMatchId === 'string' ? data.liveMatchId : undefined,
            review: data.review === true,
            before: typeof data.before === 'string' ? data.before : undefined,
            limit: 100,
        });
    });
export const getDisplayHitReplay = createServerFn({ method: 'POST' })
    .inputValidator(object)
    .handler(async ({ data }) => {
        const display = authorize(data.id, data.key);
        if (!display.config.groupId || !display.refreshToken || !uuid(data.hitId))
            throw new DisplayError('invalidHitReplay');
        const api = apiFor(display.refreshToken);
        const hit = await api.visionHit(display.config.groupId, data.hitId);
        return {
            hit,
            replay: await api.visionHitReplay(
                display.config.groupId,
                data.hitId,
                data.request === true
            ),
        };
    });
export const feedbackDisplayHit = createServerFn({ method: 'POST' })
    .inputValidator(object)
    .handler(async ({ data }) => {
        const display = authorize(data.id, data.key);
        if (!display.config.groupId || !display.refreshToken || !uuid(data.hitId))
            throw new DisplayError('invalidHitFeedback');
        return apiFor(display.refreshToken).visionHitFeedback(
            display.config.groupId,
            data.hitId,
            data.feedback as VisionHitFeedbackDto
        );
    });
export const clearCameraHit = createServerFn({ method: 'POST' })
    .inputValidator(object)
    .handler(async ({ data }) => {
        const camera = authorize(data.id, data.key);
        if (
            camera.kind !== 'camera' ||
            !camera.config.groupId ||
            !camera.refreshToken ||
            !uuid(data.hitId)
        )
            throw new DisplayError('invalidHitClear');
        const api = apiFor(camera.refreshToken);
        const hit = await api.visionHit(camera.config.groupId, data.hitId);
        if (hit.cameraId !== camera.id) throw new DisplayError('cameraHitOwnerMismatch', 403);
        await api.deleteVisionHit(camera.config.groupId, data.hitId);
    });
