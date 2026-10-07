import { useIsFocused } from 'expo-router/react-navigation';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useNextTokens } from '@/components/next/tokens';
import { VisionButton } from '@/components/vision/VisionHitCard';
import {
    VisionHitReplayDto,
    VisionHitReplaySegmentDto,
} from '@/openapi/openapi';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('vision-replay');

/** Only one segment player is mounted; each seeks before playing and ends at its clipped offset. */
export function VisionReplayPlayer({ replay }: { replay: VisionHitReplayDto }) {
    const [index, setIndex] = useState(0);
    const [run, setRun] = useState(0);
    const [ended, setEnded] = useState(false);
    const t = useNextTokens();
    const segment = replay.segments[index];
    function next() {
        if (index + 1 < replay.segments.length) setIndex(index + 1);
        else setEnded(true);
    }
    return (
        <View style={{ flex: 1, minHeight: 120, gap: 8 }}>
            {segment && (
                <SegmentPlayer
                    key={`${segment.id}:${run}`}
                    segment={segment}
                    stopped={ended}
                    onEnd={next}
                />
            )}
            <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                {ended
                    ? 'Replay ended'
                    : `Part ${index + 1} of ${replay.segments.length}`}
            </Text>
            <VisionButton
                title="Replay again"
                onPress={() => {
                    setIndex(0);
                    setRun(run + 1);
                    setEnded(false);
                }}
            />
        </View>
    );
}
function SegmentPlayer({
    segment,
    stopped,
    onEnd,
}: {
    segment: VisionHitReplaySegmentDto;
    stopped: boolean;
    onEnd: () => void;
}) {
    const t = useNextTokens();
    const focused = useIsFocused();
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const [paused, setPaused] = useState(false);
    const advanced = useRef(false);
    const started = useRef(false);
    const endRef = useRef(onEnd);
    useEffect(() => {
        endRef.current = onEnd;
    }, [onEnd]);
    const player = useVideoPlayer(segment.url, (p) => {
        p.timeUpdateEventInterval = 0.05;
        p.loop = false;
        p.staysActiveInBackground = false;
        p.seekTolerance = { toleranceBefore: 0, toleranceAfter: 0 };
    });
    useEffect(() => {
        function start() {
            if (advanced.current) return;
            if (!started.current) {
                started.current = true;
                player.seekBy(segment.startSeconds - player.currentTime);
            }
            setLoading(false);
            setReady(true);
        }
        function finish() {
            if (advanced.current) return;
            advanced.current = true;
            setReady(false);
            endRef.current();
        }
        const status = player.addListener('statusChange', (e) => {
            if (e.status === 'readyToPlay') start();
            else {
                setReady(false);
                setLoading(e.status === 'loading');
            }
            if (e.status === 'error') {
                setLoading(false);
                setError(true);
                // Player errors may contain signed video URLs; record only segment identity.
                logger.warn('replay segment unavailable', segment.id);
            }
        });
        const time = player.addListener('timeUpdate', (e) => {
            if (started.current && e.currentTime >= segment.endSeconds)
                finish();
        });
        const ended = player.addListener('playToEnd', () => {
            if (player.currentTime >= segment.endSeconds - 0.15) finish();
            else {
                setError(true);
                logger.warn('replay segment ended early', segment.id);
            }
        });
        if (player.status === 'readyToPlay') start();
        return () => {
            status.remove();
            time.remove();
            ended.remove();
        };
    }, [player, segment]);
    useEffect(() => {
        if (focused && ready && !loading && !stopped && !paused && !error)
            player.play();
        else player.pause();
        return () => player.pause();
    }, [focused, ready, loading, stopped, paused, error, player]);
    return (
        <View style={{ flex: 1, gap: 8 }}>
            <VideoView
                player={player}
                nativeControls={false}
                contentFit="contain"
                style={{
                    flex: 1,
                    minHeight: 120,
                    backgroundColor: 'black',
                    borderRadius: 8,
                }}
            />
            {loading && <ActivityIndicator />}
            {error ? (
                <Text
                    accessibilityRole="alert"
                    style={{ color: t.textSecondary }}
                >
                    This part of the replay couldn't play. Try Replay again.
                </Text>
            ) : (
                !stopped && (
                    <VisionButton
                        title={paused ? 'Resume' : 'Pause'}
                        onPress={() => setPaused(!paused)}
                    />
                )
            )}
        </View>
    );
}
