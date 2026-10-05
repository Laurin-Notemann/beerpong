import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
    containerBackground,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    monospacedDigit,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { Platform } from 'react-native';

import type { LeaderboardWidgetProps } from '@/lib/widgets/props';

/**
 * The home screen widget: the selected group's season leaderboard, top 3 (small), 4 (medium)
 * or 10 (large). It runs in the widget extension's own JS runtime: it can only use
 * `@expo/ui/swift-ui` and what's declared inside it (see the `'widget'` directive in the
 * expo-widgets docs). `useLeaderboardWidget` gives it its props.
 */
const LeaderboardWidget = (
    props: LeaderboardWidgetProps,
    environment: WidgetEnvironment
) => {
    'widget';
    const family = environment.widgetFamily;
    const small = family === 'systemSmall';
    const shown = family === 'systemLarge' ? 10 : small ? 3 : 4;
    const size = small ? 13 : 15;
    const secondary = foregroundStyle({
        type: 'hierarchical',
        style: 'secondary',
    });
    const fill = frame({
        maxWidth: Infinity,
        maxHeight: Infinity,
        alignment: 'topLeading',
    });
    const background = containerBackground(
        environment.colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        'widget'
    );

    if (!props.group) {
        return (
            <VStack
                alignment="leading"
                spacing={4}
                modifiers={[fill, background]}
            >
                <Text modifiers={[font({ weight: 'bold', size })]}>Versus</Text>
                <Text modifiers={[font({ size: 13 }), secondary]}>
                    Open the app to see your group's leaderboard.
                </Text>
            </VStack>
        );
    }

    const rows = (props.rows ?? []).slice(0, shown);

    return (
        <VStack
            alignment="leading"
            spacing={small ? 5 : 7}
            modifiers={[fill, background]}
        >
            <HStack spacing={6}>
                <Text
                    modifiers={[font({ weight: 'bold', size }), lineLimit(1)]}
                >
                    {props.group}
                </Text>
                <Spacer />
                {!small && (
                    <Text
                        modifiers={[
                            font({ size: 12 }),
                            secondary,
                            lineLimit(1),
                        ]}
                    >
                        {`${props.season} · ${props.metric}`}
                    </Text>
                )}
            </HStack>
            {rows.length === 0 ? (
                <Text modifiers={[font({ size: 13 }), secondary]}>
                    No ranked players yet.
                </Text>
            ) : (
                rows.map((row) => (
                    <HStack key={row.rank + row.name} spacing={6}>
                        <Text
                            modifiers={[
                                font({ weight: 'semibold', size }),
                                monospacedDigit(),
                                secondary,
                                frame({
                                    width: small ? 22 : 28,
                                    alignment: 'leading',
                                }),
                            ]}
                        >
                            {row.rank}
                        </Text>
                        <Text modifiers={[font({ size }), lineLimit(1)]}>
                            {row.name}
                        </Text>
                        <Spacer />
                        <Text
                            modifiers={[
                                font({ weight: 'semibold', size }),
                                monospacedDigit(),
                            ]}
                        >
                            {row.value}
                        </Text>
                    </HStack>
                ))
            )}
        </VStack>
    );
};

/** null where there are no widgets (Android) */
export const leaderboardWidget =
    Platform.OS === 'ios'
        ? createWidget('LeaderboardWidget', LeaderboardWidget)
        : null;
