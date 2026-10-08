export function MatchCameraFeed({
    url,
    onFailure,
}: {
    url: string;
    onFailure: () => void;
}) {
    return (
        <iframe
            src={url}
            title="Match camera"
            allow="autoplay"
            onError={onFailure}
            style={{ flex: 1, border: 0, width: '100%' }}
        />
    );
}
