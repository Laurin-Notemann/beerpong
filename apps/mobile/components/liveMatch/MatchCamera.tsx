import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';

import { useMatchCameraUrl } from '@/api/calls/tvHooks';
import { MatchCameraFeed } from '@/components/liveMatch/MatchCameraFeed';
import { useNextTokens } from '@/components/next/tokens';
import { VisionButton } from '@/components/vision/VisionHitCard';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('match-camera');

/**
 * The live match screen's Camera tab: the group's camera with the match over it, the hit the
 * camera sees and the players' score clips, as on Versus TV (it is the TV page). It only
 * connects while the tab is open and the app is in front, so a phone that isn't watching
 * doesn't take video from the camera. Suggestions are answered on the Cups tab.
 */
export function MatchCamera({
    groupId,
    liveMatchId,
    active,
}: {
    groupId: string | null;
    liveMatchId: string;
    /** the tab is the current page */
    active: boolean;
}) {
    const t = useNextTokens();
    const nav = useNavigation();
    const [foreground, setForeground] = useState(
        AppState.currentState === 'active'
    );
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) =>
            setForeground(state === 'active')
        );
        return () => subscription.remove();
    }, []);
    const watching = active && foreground;

    // a new link every time: it pairs once and expires
    const link = useMatchCameraUrl(groupId, liveMatchId);
    const { mutate, reset } = link;
    useEffect(() => {
        if (watching) mutate();
        else reset();
    }, [watching, mutate, reset]);
    // the page that failed; trying again gets a new link
    const [failedUrl, setFailedUrl] = useState<string>();
    const failed = !!link.data && link.data === failedUrl;

    return (
        <View style={{ flex: 1, gap: 8 }}>
            {groupId && (
                <View
                    style={{
                        flexDirection: 'row',
                        gap: 8,
                        paddingHorizontal: 16,
                    }}
                >
                    <VisionButton
                        title="Camera review"
                        onPress={() =>
                            nav.navigate('visionReview', { groupId })
                        }
                    />
                    <VisionButton
                        title="Film with this phone"
                        onPress={() => nav.navigate('tvCamera', { groupId })}
                    />
                </View>
            )}
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                {watching && <KeepScreenOn />}
                {link.isError || failed ? (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 16,
                            padding: 24,
                        }}
                    >
                        <Text
                            accessibilityRole="alert"
                            style={{
                                color: t.textSecondary,
                                textAlign: 'center',
                            }}
                        >
                            Couldn&apos;t open the camera. Check your connection
                            and try again.
                        </Text>
                        <VisionButton
                            title="Try again"
                            onPress={() => mutate()}
                        />
                    </View>
                ) : link.data && watching ? (
                    <MatchCameraFeed
                        url={link.data}
                        onFailure={() => {
                            logger.warn('Match camera page failed to load');
                            setFailedUrl(link.data);
                        }}
                    />
                ) : (
                    watching && <ActivityIndicator style={{ flex: 1 }} />
                )}
            </View>
        </View>
    );
}

function KeepScreenOn() {
    useKeepAwake('match-camera');
    return null;
}
