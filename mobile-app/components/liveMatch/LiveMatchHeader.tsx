import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';

import { HeaderTitle } from '@/components/HeaderTitle';
import { LiveDot } from '@/components/liveMatch/LiveDot';
import { LiveTimer } from '@/components/liveMatch/LiveTimer';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useAndroidIcon } from '@/lib/useAndroidIcon';
import { useTheme } from '@/theme';

/** "Live match" with the pulsing dot and the running time under it */
function Title({ startedAt, isLive }: { startedAt?: string; isLive: boolean }) {
    return (
        <View style={{ alignItems: 'center' }}>
            <HeaderTitle title="Live match" />
            {isLive && (
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                    }}
                >
                    <LiveDot size={6} />
                    <LiveTimer startedAt={startedAt} style={{ fontSize: 12 }} />
                </View>
            )}
        </View>
    );
}

/**
 * The live match screen's header: title and timer, a check mark that saves the match, and a
 * menu to discard it.
 */
export function LiveMatchHeader({
    startedAt,
    isLive,
    isFinishing,
    onFinish,
    onDiscard,
}: {
    startedAt?: string;
    isLive: boolean;
    isFinishing: boolean;
    onFinish: () => void;
    onDiscard: () => void;
}) {
    const theme = useTheme();
    const navStyles = useNavStyles();
    const isIos = Platform.OS === 'ios';
    const androidMenuIcon = useAndroidIcon(
        'dots-vertical',
        theme.color.text.primary
    );
    const androidFinishIcon = useAndroidIcon('check', theme.color.text.primary);
    const menuIcon = isIos ? 'ellipsis' : androidMenuIcon;
    const finishIcon = isIos ? 'checkmark' : androidFinishIcon;

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    title: 'Live match',
                    headerTitle: () => (
                        <Title startedAt={startedAt} isLive={isLive} />
                    ),
                }}
            />
            {isLive && menuIcon && finishIcon && (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button
                        icon={finishIcon}
                        variant="done"
                        accessibilityLabel="Finish match"
                        disabled={isFinishing}
                        onPress={onFinish}
                    />
                    <Stack.Toolbar.Menu
                        icon={menuIcon}
                        accessibilityLabel="More"
                    >
                        <Stack.Toolbar.MenuAction
                            icon="trash"
                            destructive
                            onPress={onDiscard}
                        >
                            Discard match
                        </Stack.Toolbar.MenuAction>
                    </Stack.Toolbar.Menu>
                </Stack.Toolbar>
            )}
        </>
    );
}
