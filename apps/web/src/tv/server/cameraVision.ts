import { createServerFn } from '@tanstack/react-start';

import {
    validVisionSettings,
    validVisionState,
    type VisionState,
    type VisionCommand,
} from '~/tv/lib/cameraVisionRemote';
import { authorize, DisplayError, type Display } from '~/tv/server/displays';

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
        camera.vision = { state: data.state, reportedAt: Date.now(), command };
        return command;
    });
