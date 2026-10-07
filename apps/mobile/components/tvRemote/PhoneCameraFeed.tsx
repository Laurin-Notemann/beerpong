import { useEffect, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';

import type { PhoneCameraFeedProps } from '@/components/tvRemote/PhoneCameraFeed.types';

const command = (action: string) =>
    `window.dispatchEvent(new CustomEvent('versus-camera-command', {detail: '${action}'})); true;`;

/** Only the camera page can navigate here; app credentials never enter the web view. */
export function PhoneCameraFeed({
    ref,
    url,
    active,
    onStopped,
    onFailure,
}: PhoneCameraFeedProps) {
    const view = useRef<WebView<object>>(null);
    useImperativeHandle(
        ref,
        () => ({ stop: () => view.current?.injectJavaScript(command('stop')) }),
        []
    );
    useEffect(() => {
        view.current?.injectJavaScript(command(active ? 'resume' : 'pause'));
    }, [active]);
    const cameraOrigin = new URL(url).origin;
    return (
        <WebView<object>
            ref={view}
            style={{ flex: 1, backgroundColor: '#000' }}
            source={{ uri: url }}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={(request) => {
                if (request.url === 'about:blank') return true;
                try {
                    const target = new URL(request.url);
                    return (
                        target.origin === cameraOrigin &&
                        target.pathname === '/tv/camera'
                    );
                } catch {
                    return false;
                }
            }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grantIfSameHostElseDeny"
            onMessage={({ nativeEvent }) => {
                if (nativeEvent.data === 'versus-camera:ready')
                    view.current?.injectJavaScript(
                        command(active ? 'resume' : 'pause')
                    );
                if (nativeEvent.data === 'versus-camera:stopped') onStopped();
            }}
            onError={onFailure}
            onHttpError={onFailure}
            onContentProcessDidTerminate={onFailure}
            onRenderProcessGone={onFailure}
        />
    );
}
