import {
    Button,
    Circle,
    Divider,
    HStack,
    Image,
    Spacer,
    Text,
    VStack,
} from '@expo/ui/swift-ui';
import {
    background,
    buttonStyle,
    clipShape,
    containerBackground,
    fixedSize,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    monospacedDigit,
    padding,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { Platform } from 'react-native';

import type { LiveMatchesWidgetProps } from '@/lib/widgets/props';

/**
 * The "Live matches" home screen widget: one of the selected group's matches running now, with a
 * button to move on to the next. (No match timer: a timer Text left the widget black.) Small
 * shows the names and the score, medium every player with
 * their live Elo change and the last move, large also the moves so far with the score after
 * each. Like the leaderboard widget it runs in the widget extension's own JS runtime; the app
 * gives it its props while it runs, and the API's silent pushes while it doesn't
 * (`liveScoresTask`).
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
    const GRAY = '#8E8E93';
    const secondary = foregroundStyle({
        type: 'hierarchical',
        style: 'secondary',
    });
    const fill = frame({
        maxWidth: Infinity,
        maxHeight: Infinity,
        alignment: 'top',
    });
    const background_ = containerBackground(
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
            <Circle
                modifiers={[
                    frame({ width: 7, height: 7 }),
                    foregroundStyle(match ? LIVE : GRAY),
                ]}
            />
            <Text
                modifiers={[
                    font({ weight: 'bold', size: 12 }),
                    foregroundStyle(match ? LIVE : GRAY),
                    lineLimit(1),
                    fixedSize(),
                ]}
            >
                LIVE
            </Text>
            {!small && (
                <Text
                    modifiers={[
                        font({ weight: 'bold', size: 12 }),
                        lineLimit(1),
                    ]}
                >
                    {props.group || 'Versus'}
                </Text>
            )}
            <Spacer />
            {matches.length > 1 && (
                <Button
                    target="next-match"
                    onPress={() => ({ ...props, selectedId: next?.id })}
                    modifiers={[buttonStyle('plain')]}
                >
                    <HStack spacing={4}>
                        <Text
                            modifiers={[
                                font({ weight: 'semibold', size: 12 }),
                                monospacedDigit(),
                                secondary,
                                fixedSize(),
                            ]}
                        >
                            {`${index + 1}/${matches.length}`}
                        </Text>
                        <Image
                            systemName="arrow.triangle.2.circlepath"
                            size={15}
                            color={LIVE}
                        />
                    </HStack>
                </Button>
            )}
        </HStack>
    );

    if (!match) {
        return (
            <VStack spacing={0} modifiers={[fill, background_]}>
                {header}
                <Text
                    modifiers={[
                        font({ size: 13 }),
                        secondary,
                        frame({ maxWidth: Infinity, maxHeight: Infinity }),
                    ]}
                >
                    {props.group
                        ? 'No match running.'
                        : "Open the app to see your group's live matches."}
                </Text>
            </VStack>
        );
    }

    const scoreLine = (size: number) => (
        <HStack spacing={size / 5}>
            <Text
                modifiers={[
                    font({ weight: 'heavy', size, design: 'rounded' }),
                    monospacedDigit(),
                    foregroundStyle(BLUE),
                ]}
            >
                {String(match.blueScore)}
            </Text>
            <Text
                modifiers={[
                    font({ weight: 'semibold', size: size * 0.6 }),
                    foregroundStyle(GRAY),
                ]}
            >
                –
            </Text>
            <Text
                modifiers={[
                    font({ weight: 'heavy', size, design: 'rounded' }),
                    monospacedDigit(),
                    foregroundStyle(RED),
                ]}
            >
                {String(match.redScore)}
            </Text>
        </HStack>
    );

    if (small) {
        const names = (value: string, color: string) => (
            <Text
                modifiers={[
                    font({ weight: 'semibold', size: 14 }),
                    foregroundStyle(color),
                    lineLimit(1),
                ]}
            >
                {value}
            </Text>
        );
        return (
            <VStack spacing={0} modifiers={[fill, background_]}>
                {header}
                <VStack
                    spacing={2}
                    modifiers={[
                        frame({ maxWidth: Infinity, maxHeight: Infinity }),
                    ]}
                >
                    {names(match.blueNames, BLUE)}
                    {scoreLine(44)}
                    {names(match.redNames, RED)}
                </VStack>
            </VStack>
        );
    }

    // a team as an invisible grid: names left-aligned, live Elo changes right-aligned
    const team = (side: 'blue' | 'red') => {
        const players = (match.players ?? []).filter((p) => p.team === side);
        const color = colorOf(side);
        const name = (value: string) => (
            <Text
                modifiers={[
                    font({ weight: 'semibold', size: 14 }),
                    foregroundStyle(color),
                    lineLimit(1),
                    frame({ maxWidth: Infinity, alignment: 'leading' }),
                ]}
            >
                {value}
            </Text>
        );
        return (
            <VStack
                alignment="leading"
                spacing={5}
                modifiers={[
                    frame({ maxWidth: Infinity, alignment: 'leading' }),
                ]}
            >
                {players.length === 0
                    ? name(side === 'blue' ? match.blueNames : match.redNames)
                    : players.map((p) => (
                          <HStack key={p.name} spacing={8}>
                              {name(p.name)}
                              {p.elo !== undefined && (
                                  <Text
                                      modifiers={[
                                          font({ weight: 'bold', size: 11 }),
                                          monospacedDigit(),
                                          foregroundStyle(
                                              p.elo > 0
                                                  ? LIVE
                                                  : p.elo < 0
                                                    ? RED
                                                    : GRAY
                                          ),
                                          padding({
                                              horizontal: 5,
                                              vertical: 2,
                                          }),
                                          background(
                                              p.elo > 0
                                                  ? '#1BC09726'
                                                  : p.elo < 0
                                                    ? '#EE4A5826'
                                                    : '#8E8E9326'
                                          ),
                                          clipShape('roundedRectangle', 6),
                                          fixedSize(),
                                      ]}
                                  >
                                      {p.elo > 0
                                          ? `+${p.elo}`
                                          : p.elo < 0
                                            ? `−${-p.elo}`
                                            : '0'}
                                  </Text>
                              )}
                          </HStack>
                      ))}
            </VStack>
        );
    };
    const teams = (size: number) => (
        <HStack spacing={10}>
            {team('blue')}
            {scoreLine(size)}
            {team('red')}
        </HStack>
    );

    const moves = match.moves ?? [];

    if (!large) {
        const last = moves[0];
        return (
            <VStack spacing={0} modifiers={[fill, background_]}>
                {header}
                <VStack
                    modifiers={[
                        frame({ maxWidth: Infinity, maxHeight: Infinity }),
                    ]}
                >
                    {teams(48)}
                </VStack>
                {last && (
                    <HStack spacing={0}>
                        <Text modifiers={[font({ size: 12 }), secondary]}>
                            Last:{' '}
                        </Text>
                        <Text
                            modifiers={[
                                font({ weight: 'semibold', size: 12 }),
                                foregroundStyle(colorOf(last.team)),
                                lineLimit(1),
                            ]}
                        >
                            {last.name}
                        </Text>
                        <Text
                            modifiers={[
                                font({ size: 12 }),
                                secondary,
                                lineLimit(1),
                            ]}
                        >
                            {` · ${last.move}`}
                        </Text>
                    </HStack>
                )}
            </VStack>
        );
    }

    return (
        <VStack alignment="leading" spacing={0} modifiers={[fill, background_]}>
            {header}
            <VStack
                modifiers={[
                    frame({
                        maxWidth: Infinity,
                        minHeight: 104,
                        maxHeight: 104,
                    }),
                ]}
            >
                {teams(56)}
            </VStack>
            <Divider />
            <Text
                modifiers={[
                    font({ weight: 'bold', size: 11 }),
                    foregroundStyle(GRAY),
                    padding({ top: 10, bottom: 6 }),
                ]}
            >
                MOVES
            </Text>
            {moves.length === 0 ? (
                <Text modifiers={[font({ size: 14 }), secondary]}>
                    No cups yet.
                </Text>
            ) : (
                moves.slice(0, 7).map((m, i) => (
                    <HStack
                        key={String(i)}
                        spacing={8}
                        modifiers={[padding({ vertical: 3 })]}
                    >
                        <Circle
                            modifiers={[
                                frame({ width: 7, height: 7 }),
                                foregroundStyle(colorOf(m.team)),
                            ]}
                        />
                        <Text
                            modifiers={[
                                font({ weight: 'semibold', size: 14 }),
                                foregroundStyle(colorOf(m.team)),
                                lineLimit(1),
                                frame({ width: 92, alignment: 'leading' }),
                            ]}
                        >
                            {m.name}
                        </Text>
                        <Text
                            modifiers={[
                                font({
                                    weight: i === 0 ? 'semibold' : 'regular',
                                    size: 14,
                                }),
                                i === 0
                                    ? foregroundStyle('primary')
                                    : secondary,
                                lineLimit(1),
                            ]}
                        >
                            {m.move}
                        </Text>
                        <Spacer />
                        {m.score && (
                            <Text
                                modifiers={[
                                    font({ size: 13 }),
                                    monospacedDigit(),
                                    secondary,
                                ]}
                            >
                                {m.score}
                            </Text>
                        )}
                    </HStack>
                ))
            )}
            <Spacer />
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
