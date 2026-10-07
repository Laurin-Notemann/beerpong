import { useEffect, useImperativeHandle, useRef } from 'react';

import type { PhoneCameraFeedProps } from '@/components/tvRemote/PhoneCameraFeed.types';

export function PhoneCameraFeed({
    ref,
    url,
    active,
    onStopped,
    onFailure,
}: PhoneCameraFeedProps) {
    const frame = useRef<HTMLIFrameElement>(null);
    const origin = new URL(url).origin;
    useImperativeHandle(
        ref,
        () => ({
            stop: () =>
                frame.current?.contentWindow?.postMessage(
                    'versus-camera:stop',
                    origin
                ),
        }),
        [origin]
    );
    useEffect(() => {
        const receive = (event: MessageEvent<unknown>) => {
            if (
                event.origin !== origin ||
                event.source !== frame.current?.contentWindow
            )
                return;
            if (event.data === 'versus-camera:ready')
                frame.current?.contentWindow?.postMessage(
                    `versus-camera:${active ? 'resume' : 'pause'}`,
                    origin
                );
            if (event.data === 'versus-camera:stopped') onStopped();
        };
        window.addEventListener('message', receive);
        frame.current?.contentWindow?.postMessage(
            `versus-camera:${active ? 'resume' : 'pause'}`,
            origin
        );
        return () => window.removeEventListener('message', receive);
    }, [active, onStopped, origin]);
    return (
        <iframe
            ref={frame}
            src={url}
            title="Phone camera"
            allow="camera; autoplay"
            onError={onFailure}
            style={{ flex: 1, border: 0, width: '100%' }}
        />
    );
}
