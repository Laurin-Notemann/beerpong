import { type CameraPosition, type DisplayConfig } from '@/lib/tvDisplay';
import { useCameraFeed } from '~/tv/lib/cameraFeed';

function useCorner(
    id: string,
    secret: string,
    wanted: boolean,
    config: DisplayConfig,
    position: CameraPosition
) {
    const corner = config.cameraCorners.find((c) => c.position === position);
    return useCameraFeed(
        id,
        secret,
        wanted && !!corner,
        config.groupId,
        corner ? `${corner.cameraId}:${corner.subject}` : null,
        position
    );
}

/** Fixed hook order, one peer per device, over the TV's existing event stream. */
export function useCameraFeeds(id: string, secret: string, wanted: boolean, config: DisplayConfig) {
    // Changing reserved cameras may change the main fallback. Size changes don't reconnect it.
    const selection = JSON.stringify(
        config.cameraCorners.map((c) => [c.cameraId, c.subject, c.position])
    );
    const main = useCameraFeed(
        id,
        secret,
        wanted && config.cameraMainEnabled,
        config.groupId,
        `${config.cameraId ?? ''}:${config.cameraSubject}:${selection}`
    );
    const topLeft = useCorner(id, secret, wanted, config, 'top-left');
    const topRight = useCorner(id, secret, wanted, config, 'top-right');
    const bottomLeft = useCorner(id, secret, wanted, config, 'bottom-left');
    const bottomRight = useCorner(id, secret, wanted, config, 'bottom-right');
    return {
        main,
        'top-left': topLeft,
        'top-right': topRight,
        'bottom-left': bottomLeft,
        'bottom-right': bottomRight,
    };
}

export type CameraFeeds = ReturnType<typeof useCameraFeeds>;
