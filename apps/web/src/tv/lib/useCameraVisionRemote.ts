import { useEffect, useRef, useState } from 'react';

import type { VisionCommand, VisionState } from '~/tv/lib/cameraVisionRemote';
import { randomToken } from '~/tv/lib/hooks';
import { reportCameraVision } from '~/tv/server/cameraVision';

type Snapshot = Omit<VisionState, 'session' | 'revision' | 'lastCommand'>;

/** Report metadata only; live pictures use the existing peer video connection. Commands
 * expire, are applied once, and are acknowledged by the next report, including rejection. */
export function useCameraVisionRemote(
    id: string,
    key: string,
    paired: boolean,
    snapshot: Snapshot,
    apply: (command: VisionCommand) => boolean
) {
    const [session] = useState(() => randomToken());
    const current = useRef({ snapshot, apply });
    const version = useRef({
        revision: 0,
        signature: '',
        lastCommand: null as VisionState['lastCommand'],
    });
    useEffect(() => {
        const signature = JSON.stringify([
            snapshot.device,
            snapshot.enabled,
            snapshot.areas,
            snapshot.syncMatchId,
            snapshot.firstTeam,
        ]);
        if (version.current.signature !== signature) {
            version.current.signature = signature;
            version.current.revision++;
        }
        current.current = { snapshot, apply };
    }, [snapshot, apply]);
    useEffect(() => {
        if (!paired) return;
        let stopped = false;
        let busy = false;
        let failures = 0;
        const report = async () => {
            if (stopped || busy) return;
            busy = true;
            try {
                const state: VisionState = {
                    ...current.current.snapshot,
                    session,
                    revision: version.current.revision,
                    lastCommand: version.current.lastCommand,
                };
                const command = await reportCameraVision({ data: { id, key, state } });
                failures = 0;
                if (
                    !stopped &&
                    command &&
                    command.session === session &&
                    command.revision === version.current.revision + 1
                ) {
                    const live = current.current.snapshot;
                    const applied =
                        command.expiresAt > Date.now() &&
                        command.device === live.device &&
                        !live.selectingAreas &&
                        current.current.apply(command);
                    version.current.revision = command.revision;
                    version.current.lastCommand = applied ? 'applied' : 'rejected';
                    void import('@sentry/browser').then((Sentry) =>
                        Sentry.logger.info('camera vision remote command', {
                            cameraId: id,
                            revision: command.revision,
                            result: applied ? 'applied' : 'rejected',
                            syncMatchId: applied ? command.settings.syncMatchId : live.syncMatchId,
                        })
                    );
                }
            } catch (error) {
                if (++failures === 3)
                    void import('@sentry/browser').then((Sentry) =>
                        Sentry.captureException(error, {
                            tags: { operation: 'camera-vision-report' },
                            extra: { cameraId: id },
                        })
                    );
            } finally {
                busy = false;
            }
        };
        void report();
        const timer = setInterval(() => void report(), 3000);
        return () => {
            stopped = true;
            clearInterval(timer);
        };
    }, [id, key, paired, session]);
}
