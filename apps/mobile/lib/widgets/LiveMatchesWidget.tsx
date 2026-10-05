import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
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
 * The "Live matches" home screen widget: one of the selected group's matches running now, with a
 * button to move on to the next. Small shows the score, medium adds every player's live Elo
 * change, large also the moves so far. Like the leaderboard widget it runs in the widget
 * extension's own JS runtime; the app gives it its props while it runs, and the API's silent
 * pushes while it doesn't (`liveScoresTask`).
 */
const LiveMatchesWidget = (
    props: LiveMatchesWidgetProps,
    environment: WidgetEnvironment
) => {
    'widget';
    const family = environment.widgetFamily;
    const small = family === 'systemSmall';
    const large = family === 'systemLarge';
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
    const colorOf = (team: string) => (team === 'red' ? RED : BLUE);

    const matches = props.matches ?? [];
    const index = Math.max(
        0,
        matches.findIndex((i) => i.id === props.selectedId)
    );
    const match = matches[index];
    const next = matches[(index + 1) % Math.max(1, matches.length)];

    const header = (
        <HStack spacing={6}>
            <Text
                modifiers={[
                    font({ weight: 'bold', size: 12 }),
                    foregroundStyle(match ? LIVE : 'gray'),
                ]}
            >
                LIVE
            </Text>
            <Text
                modifiers={[font({ weight: 'bold', size: 13 }), lineLimit(1)]}
            >
                {props.group || 'Versus'}
            </Text>
            <Spacer />
            {matches.length > 1 && (
                <Button
                    target="next-match"
                    onPress={() => ({ ...props, selectedId: next?.id })}
                >
                    <HStack spacing={4}>
                        <Text
                            modifiers={[
                                font({ size: 12 }),
                                monospacedDigit(),
                                secondary,
                            ]}
                        >
                            {`${index + 1}/${matches.length}`}
                        </Text>
                        <Image
                            systemName="chevron.right.circle.fill"
                            size={18}
                            color={LIVE}
                        />
                    </HStack>
                </Button>
            )}
        </HStack>
    );

    if (!match) {
        return (
            <VStack
                alignment="leading"
                spacing={6}
                modifiers={[fill, background]}
            >
                {header}
                <Text modifiers={[font({ size: 13 }), secondary]}>
                    {props.group
                        ? 'No match running.'
                        : "Open the app to see your group's live matches."}
                </Text>
            </VStack>
        );
    }

    const score = (value: number, color: string) => (
        <Text
            modifiers={[
                font({
                    weight: 'bold',
                    size: small ? 30 : 34,
                    design: 'rounded',
                }),
                monospacedDigit(),
                foregroundStyle(color),
            ]}
        >
            {String(value)}
        </Text>
    );
    const scoreLine = (
        <HStack spacing={8}>
            {score(match.blueScore, BLUE)}
            <Text modifiers={[font({ size: 22 }), secondary]}>–</Text>
            {score(match.redScore, RED)}
        </HStack>
    );

    if (small) {
        const names = (value: string, color: string) => (
            <Text
                modifiers={[
                    font({ weight: 'semibold', size: 13 }),
                    foregroundStyle(color),
                    lineLimit(1),
                ]}
            >
                {value}
            </Text>
        );
        return (
            <VStack
                alignment="leading"
                spacing={4}
                modifiers={[fill, background]}
            >
                {header}
                {names(match.blueNames, BLUE)}
                {scoreLine}
                {names(match.redNames, RED)}
            </VStack>
        );
    }

    // one team's players with their live Elo change, if the API sent it
    const team = (side: 'blue' | 'red', alignment: 'leading' | 'trailing') => {
        const players = (match.players ?? []).filter((p) => p.team === side);
        const names = side === 'blue' ? match.blueNames : match.redNames;
        return (
            <VStack
                alignment={alignment}
                spacing={2}
                modifiers={[frame({ maxWidth: Infinity, alignment })]}
            >
                {players.length === 0 ? (
                    <Text
                        modifiers={[
                            font({ weight: 'semibold', size: 13 }),
                            foregroundStyle(colorOf(side)),
                            lineLimit(2),
                        ]}
                    >
                        {names}
                    </Text>
                ) : (
                    players.map((p) => (
                        <HStack key={p.name} spacing={4}>
                            <Text
                                modifiers={[
                                    font({ weight: 'semibold', size: 13 }),
                                    foregroundStyle(colorOf(side)),
                                    lineLimit(1),
                                ]}
                            >
                                {p.name}
                            </Text>
                            {p.elo !== undefined && (
                                <Text
                                    modifiers={[
                                        font({ weight: 'semibold', size: 12 }),
                                        monospacedDigit(),
                                        foregroundStyle(
                                            p.elo > 0
                                                ? LIVE
                                                : p.elo < 0
                                                  ? RED
                                                  : 'gray'
                                        ),
                                    ]}
                                >
                                    {p.elo > 0 ? `+${p.elo}` : String(p.elo)}
                                </Text>
                            )}
                        </HStack>
                    ))
                )}
            </VStack>
        );
    };

    const moves = (match.moves ?? []).slice(0, 6);

    return (
        <VStack alignment="leading" spacing={8} modifiers={[fill, background]}>
            {header}
            <HStack spacing={10}>
                {team('blue', 'leading')}
                {scoreLine}
                {team('red', 'trailing')}
            </HStack>
            {large && moves.length > 0 && (
                <VStack alignment="leading" spacing={4}>
                    <Text
                        modifiers={[
                            font({ weight: 'semibold', size: 12 }),
                            secondary,
                        ]}
                    >
                        MOVES
                    </Text>
                    {moves.map((m, i) => (
                        <HStack key={String(i)} spacing={6}>
                            <Text
                                modifiers={[
                                    font({ weight: 'semibold', size: 13 }),
                                    foregroundStyle(colorOf(m.team)),
                                    lineLimit(1),
                                ]}
                            >
                                {m.name}
                            </Text>
                            <Text
                                modifiers={[
                                    font({ size: 13 }),
                                    secondary,
                                    lineLimit(1),
                                ]}
                            >
                                {m.move}
                            </Text>
                        </HStack>
                    ))}
                </VStack>
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
