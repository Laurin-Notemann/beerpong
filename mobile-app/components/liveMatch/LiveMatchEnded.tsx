import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { useEnterStyle } from '@/components/liveMatch/motion';
import { useNextTokens } from '@/components/next/tokens';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';

const COPY = {
    finished: {
        icon: 'check' as const,
        title: 'Match finished',
        body: "It's saved and counts for the leaderboard.",
        action: 'View match',
    },
    discarded: {
        icon: 'close' as const,
        title: 'This match was discarded',
        body: "It ended without a result and doesn't count.",
        action: 'Close',
    },
};

/** What the live match screen shows once the match ended, here or on another phone. */
export function LiveMatchEnded({
    kind,
    onAction,
}: {
    kind: keyof typeof COPY;
    onAction: () => void;
}) {
    const t = useNextTokens();
    const enter = useEnterStyle();
    const copy = COPY[kind];

    return (
        <View
            style={{
                flex: 1,
                justifyContent: 'center',
                paddingHorizontal: 32,
            }}
        >
            <Animated.View style={[{ alignItems: 'center', gap: 12 }, enter]}>
                <View
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: t.hairline,
                        backgroundColor: t.surface,
                    }}
                >
                    <Icon
                        name={copy.icon}
                        size={28}
                        color={
                            kind === 'finished'
                                ? t.theme.color.positive
                                : t.textSecondary
                        }
                    />
                </View>
                <Text
                    accessibilityRole="header"
                    style={{
                        color: t.text,
                        fontSize: 20,
                        fontWeight: '700',
                        textAlign: 'center',
                    }}
                >
                    {copy.title}
                </Text>
                <Text
                    style={{
                        color: t.textSecondary,
                        fontSize: 15,
                        textAlign: 'center',
                    }}
                >
                    {copy.body}
                </Text>
                <View
                    style={{
                        flexDirection: 'row',
                        alignSelf: 'stretch',
                        marginTop: 12,
                    }}
                >
                    <OverlayTextButton
                        fullWidth
                        title={copy.action}
                        onPress={onAction}
                    />
                </View>
            </Animated.View>
        </View>
    );
}
