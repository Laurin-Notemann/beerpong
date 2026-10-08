import { WebView } from 'react-native-webview';

/** Versus TV's camera view in a web view; it only navigates within the TV page. */
export function MatchCameraFeed({
    url,
    onFailure,
}: {
    url: string;
    onFailure: () => void;
}) {
    const { origin } = new URL(url);
    return (
        <WebView
            style={{ flex: 1, backgroundColor: '#000' }}
            source={{ uri: url }}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={(request) => {
                if (request.url === 'about:blank') return true;
                try {
                    const target = new URL(request.url);
                    return (
                        target.origin === origin &&
                        (target.pathname === '/tv' ||
                            target.pathname === '/tv/')
                    );
                } catch {
                    return false;
                }
            }}
            // the pages swipe over it; the TV page doesn't scroll
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onError={onFailure}
            onHttpError={onFailure}
            onContentProcessDidTerminate={onFailure}
            onRenderProcessGone={onFailure}
        />
    );
}
