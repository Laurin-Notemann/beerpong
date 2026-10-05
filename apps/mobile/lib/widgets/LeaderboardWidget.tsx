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
 * The home screen widget: the selected group's matches running now (1 small, 2 medium, 4 large),
 * else its season leaderboard, top 3, 4 or 10. It runs in the widget extension's own JS runtime:
 * it can only use `@expo/ui/swift-ui` and what's declared inside it (see the `'widget'`
 * directive in the expo-widgets docs). `showOnWidget` gives it its props.
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

    const live = (props.live ?? []).slice(0, small ? 1 : shown / 2);
    if (live.length) {
        // theme.color.team and theme.color.positive
        const BLUE = '#18A0FB';
        const RED = '#EE4A58';
        const score = (value: number, color: string) => (
            <Text
                modifiers={[
                    font({
                        weight: 'bold',
                        size: small ? 28 : 22,
                        design: 'rounded',
                    }),
                    monospacedDigit(),
                    foregroundStyle(color),
                ]}
            >
                {String(value)}
            </Text>
        );
        const names = (
            value: string,
            color: string,
            alignment: 'leading' | 'trailing'
        ) => (
            <Text
                modifiers={[
                    font({ weight: 'semibold', size: 13 }),
                    foregroundStyle(color),
                    lineLimit(small ? 1 : 2),
                    frame({ maxWidth: Infinity, alignment }),
                ]}
            >
                {value}
            </Text>
        );

        return (
            <VStack
                alignment="leading"
                spacing={small ? 4 : 8}
                modifiers={[fill, background]}
            >
                <HStack spacing={6}>
                    <Text
                        modifiers={[
                            font({ weight: 'bold', size: 12 }),
                            foregroundStyle('#1BC097'),
                        ]}
                    >
                        LIVE
                    </Text>
                    <Text
                        modifiers={[
                            font({ weight: 'bold', size: 13 }),
                            lineLimit(1),
                        ]}
                    >
                        {props.group}
                    </Text>
                </HStack>
                {live.map((match) =>
                    small ? (
                        <VStack key={match.id} alignment="leading" spacing={2}>
                            {names(match.blueNames, BLUE, 'leading')}
                            <HStack spacing={6}>
                                {score(match.blueScore, BLUE)}
                                <Text
                                    modifiers={[font({ size: 20 }), secondary]}
                                >
                                    –
                                </Text>
                                {score(match.redScore, RED)}
                            </HStack>
                            {names(match.redNames, RED, 'leading')}
                        </VStack>
                    ) : (
                        <HStack key={match.id} spacing={8}>
                            {names(match.blueNames, BLUE, 'leading')}
                            {score(match.blueScore, BLUE)}
                            <Text modifiers={[font({ size: 18 }), secondary]}>
                                –
                            </Text>
                            {score(match.redScore, RED)}
                            {names(match.redNames, RED, 'trailing')}
                        </HStack>
                    )
                )}
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

/**
 * how long the widget shows matches it heard nothing more about: iOS may drop the API's pushes,
 * so the end of a match may never reach it
 */
const LIVE_SHOWN_MS = 45 * 60 * 1000;

export function showOnWidget(props: LeaderboardWidgetProps) {
    if (!leaderboardWidget) return;
    const now = Date.now();
    leaderboardWidget.updateTimeline([
        { date: new Date(now), props },
        ...(props.live.length
            ? [
                  {
                      date: new Date(now + LIVE_SHOWN_MS),
                      props: { ...props, live: [] },
                  },
              ]
            : []),
    ]);
}
