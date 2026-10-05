import { HStack, Text, VStack } from '@expo/ui/swift-ui';
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

import type { LiveMatchesWidgetProps } from '@/lib/widgets/props';

/**
 * The "Live matches" home screen widget: the scores of the selected group's matches running now,
 * 1 (small), 2 (medium) or 4 (large). Like the leaderboard widget it runs in the widget
 * extension's own JS runtime. The app gives it its props while it runs, and the API's silent
 * pushes while it doesn't (`liveScoresTask`).
 */
const LiveMatchesWidget = (
    props: LiveMatchesWidgetProps,
    environment: WidgetEnvironment
) => {
    'widget';
    const family = environment.widgetFamily;
    const small = family === 'systemSmall';
    const shown = family === 'systemLarge' ? 4 : small ? 1 : 2;
    // theme.color.team and theme.color.positive
    const BLUE = '#18A0FB';
    const RED = '#EE4A58';
    const LIVE = '#1BC097';
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

    const matches = (props.matches ?? []).slice(0, shown);

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
                        foregroundStyle(matches.length ? LIVE : 'gray'),
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
                    {props.group || 'Versus'}
                </Text>
            </HStack>
            {!props.group ? (
                <Text modifiers={[font({ size: 13 }), secondary]}>
                    Open the app to see your group's live matches.
                </Text>
            ) : matches.length === 0 ? (
                <Text modifiers={[font({ size: 13 }), secondary]}>
                    No match running.
                </Text>
            ) : (
                matches.map((match) =>
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
                )
            )}
        </VStack>
    );
};

/** null where there are no widgets (Android) */
export const liveMatchesWidget =
    Platform.OS === 'ios'
        ? createWidget('LiveMatchesWidget', LiveMatchesWidget)
        : null;

/**
 * how long the widget shows matches it heard nothing more about: iOS may drop the API's pushes,
 * so the end of a match may never reach it
 */
const SHOWN_MS = 45 * 60 * 1000;

export function showLiveMatches(props: LiveMatchesWidgetProps) {
    if (!liveMatchesWidget) return;
    const now = Date.now();
    liveMatchesWidget.updateTimeline([
        { date: new Date(now), props },
        ...(props.matches.length
            ? [
                  {
                      date: new Date(now + SHOWN_MS),
                      props: { ...props, matches: [] },
                  },
              ]
            : []),
    ]);
}
