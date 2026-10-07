import { createServerFn } from '@tanstack/react-start';

import {
    validVisionSettings,
    validVisionState,
    type VisionState,
    type VisionCommand,
} from '~/tv/lib/cameraVisionRemote';
import { authorize, byGroup, cameraFor, DisplayError, type Display } from '~/tv/server/displays';

export interface CameraVision {
    state: VisionState;
    reportedAt: number;
    command: VisionCommand | null;
}

/** Device calibration stays on the camera. A group member may adjust it remotely, but
 * must target a recent report from this browser session and this exact input device. */
export function requestVision(camera: Display, input: unknown) {
    const report = camera.vision;
    const value = input as Record<string, unknown> | null;
    if (!report || Date.now() - report.reportedAt > 15_000)
        throw new DisplayError('cameraNotReporting', 409);
    if (!value || typeof value !== 'object' || !validVisionSettings(value.settings))
        throw new DisplayError('invalidVisionSettings');
    const settings = value.settings;
    if (
        settings.syncTvId &&
        !byGroup(camera.config.groupId ?? '').some(
            (tv) => tv.id === settings.syncTvId && cameraFor(tv) === camera
        )
    )
        throw new DisplayError('cameraMappingTvNotFound', 409);
    const state = report.state;
    if (
        value.session !== state.session ||
        value.revision !== state.revision ||
        value.device !== state.device ||
        !state.device ||
        state.selectingAreas
    )
        throw new DisplayError('cameraCalibrationChanged', 409);
    if (report.command && report.command.expiresAt > Date.now())
        throw new DisplayError('cameraCommandPending', 409);
    if (settings.syncMatchId && !state.matches.some((m) => m.id === settings.syncMatchId))
        throw new DisplayError('cameraMatchNotRunning', 409);
    const command: VisionCommand = {
        session: state.session,
        revision: state.revision + 1,
        device: state.device,
        settings,
        expiresAt: Date.now() + 15_000,
    };
    report.command = command;
    return command;
}

/** Apply exactly the rotation and mirroring used by CameraVideo, then read the TV's team sides. */
export function mappedFirstTeam(camera: Display, state: VisionState) {
    if (!state.syncTvId) return state.firstTeam;
    const tv = byGroup(camera.config.groupId ?? '').find((d) => d.id === state.syncTvId);
    if (!tv || cameraFor(tv) !== camera || !state.areas) return null;
    const [a, b] = state.areas;
    const dx = ((a.x + a.width / 2 - b.x - b.width / 2) * state.width) / Math.max(state.height, 1);
    const dy = a.y + a.height / 2 - b.y - b.height / 2;
    const angle = (camera.config.cameraRotation * Math.PI) / 180;
    const screenX =
        (dx * Math.cos(angle) - dy * Math.sin(angle)) * (camera.config.cameraVideoFlipped ? -1 : 1);
    if (Math.abs(screenX) < Math.hypot(dx, dy) * 0.2) return null;
    const areaOnLeft = screenX < 0;
    return areaOnLeft !== tv.config.cameraOverlayFlipped ? 'blue' : 'red';
}

export const reportCameraVision = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => {
        const value = data as Record<string, unknown> | null;
        if (!value || !validVisionState(value.state)) throw new DisplayError('invalidVisionReport');
        return { id: value.id, key: value.key, state: value.state };
    })
    .handler(({ data }) => {
        const camera = authorize(data.id, data.key);
        if (camera.kind !== 'camera' || !camera.config.groupId)
            throw new DisplayError('cameraNotPaired', 403);
        let command = camera.vision?.command ?? null;
        if (
            command &&
            (command.session !== data.state.session ||
                command.device !== data.state.device ||
                command.revision <= data.state.revision ||
                command.expiresAt < Date.now())
        )
            command = null;
        const team = mappedFirstTeam(camera, data.state);
        if (!command && data.state.syncTvId && team && team !== data.state.firstTeam) {
            command = {
                session: data.state.session,
                revision: data.state.revision + 1,
                device: data.state.device,
                settings: {
                    enabled: data.state.enabled,
                    ballEnabled: data.state.ballEnabled,
                    ballColor: data.state.ballColor,
                    areas: data.state.areas,
                    syncMatchId: data.state.syncMatchId,
                    firstTeam: team,
                    syncTvId: data.state.syncTvId,
                },
                expiresAt: Date.now() + 15_000,
            };
        }
        camera.vision = { state: data.state, reportedAt: Date.now(), command };
        return command;
    });

/** The paired debug viewer reads metadata through its own display identity. */
export const getCameraVisionDebug = createServerFn({ method: 'POST' })
    .inputValidator((data: { id: string; key: string }) => data)
    .handler(({ data }) => {
        const tv = authorize(data.id, data.key);
        if (tv.kind !== 'tv' || !tv.config.groupId) throw new DisplayError('displayNotPaired', 403);
        const camera = cameraFor(tv);
        if (!camera) return null;
        return {
            cameraId: camera.id,
            name: camera.name,
            config: camera.config,
            state: camera.vision?.state ?? null,
            reportedAt: camera.vision?.reportedAt ?? 0,
            commandPending: !!camera.vision?.command,
        };
    });
