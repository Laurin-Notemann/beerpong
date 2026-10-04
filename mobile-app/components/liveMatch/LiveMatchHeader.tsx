import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageSourcePropType, Platform, View } from 'react-native';

import { HeaderTitle } from '@/components/HeaderTitle';
import { LiveDot } from '@/components/liveMatch/LiveDot';
import { LiveTimer } from '@/components/liveMatch/LiveTimer';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useTheme } from '@/theme';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('live-match');

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
 * Android's toolbar menu can't draw SF Symbols and needs an image; the app's icon font makes
 * one. Undefined until it's rendered (a frame or two).
 */
function useAndroidMenuIcon(color: string) {
    const [icon, setIcon] = useState<ImageSourcePropType>();

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        let cancelled = false;
        MaterialCommunityIcons.getImageSource('dots-vertical', 24, color)
            .then((source) => {
                if (!cancelled && source) setIcon(source);
            })
            .catch((err) => logger.error('failed to render menu icon', err));
        return () => {
            cancelled = true;
        };
    }, [color]);

    return icon;
}

/** The live match screen's header: title and timer, and a menu to discard the match. */
export function LiveMatchHeader({
    startedAt,
    isLive,
    onDiscard,
}: {
    startedAt?: string;
    isLive: boolean;
    onDiscard: () => void;
}) {
    const theme = useTheme();
    const navStyles = useNavStyles();
    const androidIcon = useAndroidMenuIcon(theme.color.text.primary);
    const menuIcon = Platform.OS === 'ios' ? 'ellipsis' : androidIcon;

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
            {isLive && menuIcon && (
                <Stack.Toolbar placement="right">
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
