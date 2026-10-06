import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { toast } from 'sonner-native';

import { Icon } from '@/components/Icon';
import Text from '@/components/Text';
import {
    scoreClipSource,
    useScoreClipPreload,
} from '@/lib/useScoreClipPreload';
import { useTheme } from '@/theme';

const TOAST_ID = 'score-clip';
/** a clip that doesn't end (or start) by then goes away anyway; clips are at most 10 s */
const MAX_MS = 15_000;

/**
 * Plays the scorer's score clip in a toast, on the phone that entered their point (Experimental
 * Features → Score Clips), like Versus TV does. A newer point replaces it; it goes away when the
 * clip ends, or with its close button or a swipe.
 */
export function showScoreClipToast(clip: {
    url: string;
    name: string;
    team: 'red' | 'blue';
}) {
    toast.custom(<ScoreClipToast key={Date.now()} {...clip} />, {
        id: TOAST_ID,
        duration: Infinity,
    });
}

const dismiss = () => toast.dismiss(TOAST_ID);

function ScoreClipToast({
    url,
    name,
    team,
}: {
    url: string;
    name: string;
    team: 'red' | 'blue';
}) {
    const theme = useTheme();
    useScoreClipPreload([url]);
    const [source] = useState(() => scoreClipSource(url));
    const player = useVideoPlayer(source, (p) => p.play());
    const triedStreaming = useRef(source === url);

    useEventListener(player, 'playToEnd', dismiss);
    useEventListener(player, 'statusChange', ({ status }) => {
        if (status !== 'error') return;
        if (triedStreaming.current) return dismiss();
        triedStreaming.current = true;
        void player
            .replaceAsync(url)
            .then(() => player.play())
            .catch(dismiss);
    });
    useEffect(() => {
        const timeout = setTimeout(dismiss, MAX_MS);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: 16,
                padding: 8,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: theme.color.team[team],
                backgroundColor: theme.panel.light.active,
            }}
        >
            <VideoView
                player={player}
                nativeControls={false}
                contentFit="cover"
                style={{ width: 90, height: 160, borderRadius: 12 }}
            />
            <View style={{ flex: 1 }}>
                <Text
                    variant="body1"
                    numberOfLines={2}
                    style={{
                        color: theme.color.team[team],
                        fontWeight: '700',
                    }}
                >
                    {name}
                </Text>
                <Text variant="body2" color="secondary">
                    scored
                </Text>
            </View>
            <TouchableOpacity
                onPress={dismiss}
                hitSlop={12}
                accessibilityLabel="Close"
                style={{ alignSelf: 'flex-start', padding: 4 }}
            >
                <Icon name="close" size={20} color={theme.icon.secondary} />
            </TouchableOpacity>
        </View>
    );
}
