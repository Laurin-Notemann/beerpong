import { isAxiosError } from 'axios';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
    useRequestVisionReplay,
    useVisionHit,
    useVisionReplay,
    visionHitNotFound,
} from '@/api/calls/visionHitHooks';
import { useNextTokens } from '@/components/next/tokens';
import { VisionButton, VisionHitCard } from '@/components/vision/VisionHitCard';
import { VisionReplayPlayer } from '@/components/vision/VisionReplayPlayer';
import { useInsets } from '@/lib/useInsets';
import { VisionHitReplayDto } from '@/openapi/openapi';

/** Reject incomplete coverage even when restoring an older persisted replay. */
function coversWindow(replay: VisionHitReplayDto) {
    let coveredTo = Date.parse(replay.from);
    for (const segment of replay.segments) {
        const start =
            Date.parse(segment.startedAt) + segment.startSeconds * 1000;
        const end = Date.parse(segment.startedAt) + segment.endSeconds * 1000;
        if (
            start > coveredTo + 50 ||
            start < coveredTo - 50 ||
            end <= start ||
            end > Date.parse(replay.to) + 50
        )
            return false;
        coveredTo = Math.max(coveredTo, end);
    }
    return (
        replay.complete &&
        replay.segments.length > 0 &&
        coveredTo >= Date.parse(replay.to) - 50
    );
}

export default function VisionReplayScreen() {
    const { groupId, id } = useLocalSearchParams<{
        groupId: string;
        id: string;
    }>();
    const t = useNextTokens();
    const insets = useInsets(true);
    const [waitingSince, setWaitingSince] = useState(Date.now);
    const [timedOut, setTimedOut] = useState(false);
    const replay = useVisionReplay(groupId ?? '', id ?? '', waitingSince);
    const hit = useVisionHit(groupId ?? '', id ?? '');
    const request = useRequestVisionReplay(groupId ?? '', id ?? '');
    const unavailable =
        hit.data === null ||
        replay.data === null ||
        visionHitNotFound(hit.error) ||
        visionHitNotFound(replay.error) ||
        visionHitNotFound(request.error);
    const [tvRequested, setTvRequested] = useState(false);
    const initialRequest = useRef(false);
    const pendingTvRequest = useRef(false);
    const { mutate: postReplay } = request;

    useEffect(() => {
        const timer = setTimeout(() => setTimedOut(true), 90000);
        return () => clearTimeout(timer);
    }, [waitingSince]);
    useEffect(() => {
        if (unavailable || initialRequest.current || !groupId || !id) return;
        initialRequest.current = true;
        postReplay(undefined, {
            onSuccess: (r) => {
                setTvRequested(r.complete);
                pendingTvRequest.current = !r.complete;
            },
        });
    }, [groupId, id, postReplay, unavailable]);
    useEffect(() => {
        if (unavailable || !replay.data?.complete || !pendingTvRequest.current)
            return;
        pendingTvRequest.current = false;
        postReplay(undefined, { onSuccess: (r) => setTvRequested(r.complete) });
    }, [replay.data, postReplay, unavailable]);

    function retry() {
        setTimedOut(false);
        setWaitingSince(Date.now());
        void replay.refetch();
    }
    const data = replay.data;
    const ready = data && coversWindow(data);
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: t.theme.color.bg,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
            }}
        >
            <Stack.Screen options={{ title: 'Camera replay' }} />
            {unavailable ? (
                <Text
                    accessibilityRole="alert"
                    style={{ color: t.textSecondary, padding: 16 }}
                >
                    This camera suggestion was removed. Its replay and feedback
                    are no longer available.
                </Text>
            ) : (
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        padding: 16,
                        gap: 12,
                    }}
                >
                    <Text style={{ color: t.textSecondary }}>
                        3 seconds before the suggestion, 2 seconds after.
                    </Text>
                    {ready ? (
                        <VisionReplayPlayer key={id} replay={data} />
                    ) : (
                        <View
                            style={{
                                flex: 1,
                                minHeight: 120,
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            {replay.isFetching && <ActivityIndicator />}
                            <Text
                                accessibilityRole={
                                    replay.isError ? 'alert' : undefined
                                }
                                style={{
                                    color: t.textSecondary,
                                    textAlign: 'center',
                                }}
                            >
                                {replay.isError
                                    ? "Couldn't load the replay."
                                    : timedOut
                                      ? 'Replay unavailable. Footage may still be uploading or may have been removed.'
                                      : data?.segments.length
                                        ? 'Replay has a gap. Waiting for the remaining footage…'
                                        : 'Waiting for footage. It may still be uploading or unavailable.'}
                            </Text>
                            <VisionButton
                                title="Retry replay"
                                onPress={retry}
                                disabled={replay.isFetching}
                            />
                        </View>
                    )}
                    <VisionButton
                        title={request.isPending ? 'Requesting…' : 'Play on TV'}
                        disabled={!ready || request.isPending}
                        onPress={() =>
                            postReplay(undefined, {
                                onSuccess: (r) => setTvRequested(r.complete),
                            })
                        }
                    />
                    {request.isError && (
                        <Text
                            accessibilityRole="alert"
                            style={{ color: t.textSecondary }}
                        >
                            {isAxiosError(request.error) &&
                            request.error.response?.status === 429
                                ? 'Replay was just requested. Wait a few seconds and try again.'
                                : "Couldn't request replay on TV. Try again."}
                        </Text>
                    )}
                    {tvRequested && !request.isError && (
                        <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                            Replay requested on TV.
                        </Text>
                    )}
                    {hit.data && (
                        <VisionHitCard
                            hit={hit.data}
                            review
                            showReplay={false}
                        />
                    )}
                </ScrollView>
            )}
        </View>
    );
}
