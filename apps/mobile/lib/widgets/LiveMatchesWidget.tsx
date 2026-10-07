import {
    Button,
    Circle,
    Divider,
    HStack,
    Image,
    Spacer,
    Text,
    VStack,
    ZStack,
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
    layoutPriority,
    lineLimit,
    monospacedDigit,
    offset,
    padding,
    resizable,
} from '@expo/ui/swift-ui/modifiers';
import {
    createWidget,
    type WidgetEnvironment,
    widgetsDirectory,
} from 'expo-widgets';
import { Platform } from 'react-native';

import { activityAvatarsDirectory } from '@/lib/widgets/activityAvatars';
import type { LiveMatchesWidgetProps, WidgetPlayer } from '@/lib/widgets/props';

/** `avatarsDirectory` in the layout's source, which only knows its props */
const AVATARS_DIRECTORY = '__VERSUS_WIDGET_AVATARS__';

/**
 * The "Live matches" home screen widget: one of the selected group's matches running now, with a
 * button to move on to the next. (No match timer: a timer Text left the widget black.) Small
 * shows the names and the score; medium, like the Live Activity, each team's cups and its
 * players' avatars with their live Elo change, and the last move; large also the moves so far
 * with the score after each. Like the leaderboard widget it runs in the widget extension's own
 * JS runtime; the app gives it its props while it runs, and the API's silent pushes while it
 * doesn't (`liveScoresTask`).
 */
const LiveMatchesWidget = (
    props: LiveMatchesWidgetProps,
    environment: WidgetEnvironment
) => {
    'widget';
    // the app puts its directory here when it registers the layout (createWidget below)
    const avatarsDirectory = '__VERSUS_WIDGET_AVATARS__';
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
        // the score keeps its size; the team columns next to it give way
        <HStack spacing={size / 5} modifiers={[fixedSize(), layoutPriority(1)]}>
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

    const eloOf = (elo: number) => ({
        text: elo > 0 ? `+${elo}` : elo < 0 ? `−${-elo}` : '0',
        color: elo > 0 ? LIVE : elo < 0 ? RED : GRAY,
        tint: elo > 0 ? '#1BC09726' : elo < 0 ? '#EE4A5826' : '#8E8E9326',
    });
    /** a team's cups as the Live Activity draws them: blue's apex points right, red's left */
    const rack = (team: 'blue' | 'red', cell: number) => {
        const code = team === 'blue' ? match.blueCups : match.redCups;
        const cups = (code ?? '').match(/.{3}/g) ?? [];
        if (!cups.length) return null;
        return (
            <ZStack
                modifiers={[
                    frame({ width: cell * 8, height: cell * 8 }),
                    fixedSize(),
                ]}
            >
                {cups.map((cup) => {
                    const x = Number(cup[0]);
                    const y = Number(cup[1]);
                    const column = team === 'blue' ? y : 6 - y;
                    return (
                        <Circle
                            key={cup.slice(0, 2)}
                            modifiers={[
                                foregroundStyle(
                                    cup[2] === '1' ? colorOf(team) : '#8E8E9340'
                                ),
                                frame({
                                    width: cell * 1.8,
                                    height: cell * 1.8,
                                }),
                                offset({
                                    x: (column - 3) * cell,
                                    y: (x - 3) * cell,
                                }),
                            ]}
                        />
                    );
                })}
            </ZStack>
        );
    };
    /** a player's avatar; initials until this phone has a copy (activityAvatars.ts) */
    const avatar = (player: WidgetPlayer, size: number) => (
        <ZStack modifiers={[fixedSize()]}>
            <Circle
                modifiers={[
                    foregroundStyle(colorOf(player.team)),
                    frame({ width: size, height: size }),
                ]}
            />
            <Text
                modifiers={[
                    font({ weight: 'bold', size: size * 0.4 }),
                    foregroundStyle('#FFFFFF'),
                ]}
            >
                {player.name
                    .split(' ')
                    .map((i) => i.slice(0, 1))
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
            </Text>
            {!!player.avatar && (
                <Image
                    uiImage={`${avatarsDirectory}${player.avatar}.jpg`}
                    modifiers={[
                        resizable(),
                        frame({ width: size, height: size }),
                        clipShape('circle'),
                    ]}
                />
            )}
        </ZStack>
    );
    const playersOf = (side: 'blue' | 'red') =>
        (match.players ?? []).filter((p) => p.team === side);

    const moves = match.moves ?? [];

    if (!large) {
        const last = moves[0];
        // a team as the Live Activity shows it: the avatars, each with its live Elo change
        // under it, over the names
        const team = (side: 'blue' | 'red') => {
            const alignment = side === 'blue' ? 'leading' : 'trailing';
            return (
                <VStack
                    alignment={alignment}
                    spacing={4}
                    modifiers={[frame({ maxWidth: Infinity, alignment })]}
                >
                    <HStack spacing={2}>
                        {playersOf(side)
                            .slice(0, 3)
                            .map((p) => (
                                <VStack key={p.name} spacing={1}>
                                    {avatar(p, 20)}
                                    {p.elo !== undefined && (
                                        <Text
                                            modifiers={[
                                                font({
                                                    weight: 'bold',
                                                    size: 9,
                                                }),
                                                monospacedDigit(),
                                                foregroundStyle(
                                                    eloOf(p.elo).color
                                                ),
                                                lineLimit(1),
                                                fixedSize(),
                                            ]}
                                        >
                                            {eloOf(p.elo).text}
                                        </Text>
                                    )}
                                </VStack>
                            ))}
                    </HStack>
                    <Text
                        modifiers={[
                            font({ weight: 'semibold', size: 13 }),
                            foregroundStyle(colorOf(side)),
                            lineLimit(2),
                            frame({ maxWidth: Infinity, alignment }),
                        ]}
                    >
                        {side === 'blue' ? match.blueNames : match.redNames}
                    </Text>
                </VStack>
            );
        };
        return (
            <VStack spacing={0} modifiers={[fill, background_]}>
                {header}
                <HStack
                    spacing={8}
                    modifiers={[
                        frame({ maxWidth: Infinity, maxHeight: Infinity }),
                    ]}
                >
                    {rack('blue', 4)}
                    {team('blue')}
                    {scoreLine(36)}
                    {team('red')}
                    {rack('red', 4)}
                </HStack>
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

    // a team as an invisible grid: avatars and names left-aligned, live Elo changes right-aligned
    const team = (side: 'blue' | 'red') => {
        const players = playersOf(side);
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
                    : players.slice(0, 3).map((p) => (
                          <HStack key={p.name} spacing={6}>
                              {avatar(p, 20)}
                              {name(p.name)}
                              {p.elo !== undefined && (
                                  <Text
                                      modifiers={[
                                          font({ weight: 'bold', size: 11 }),
                                          monospacedDigit(),
                                          foregroundStyle(eloOf(p.elo).color),
                                          padding({
                                              horizontal: 5,
                                              vertical: 2,
                                          }),
                                          background(eloOf(p.elo).tint),
                                          clipShape('roundedRectangle', 6),
                                          fixedSize(),
                                      ]}
                                  >
                                      {eloOf(p.elo).text}
                                  </Text>
                              )}
                          </HStack>
                      ))}
            </VStack>
        );
    };

    return (
        <VStack alignment="leading" spacing={0} modifiers={[fill, background_]}>
            {header}
            <HStack
                spacing={8}
                modifiers={[padding({ top: 8 }), frame({ maxWidth: Infinity })]}
            >
                {rack('blue', 6)}
                <Spacer />
                {scoreLine(52)}
                <Spacer />
                {rack('red', 6)}
            </HStack>
            <HStack
                alignment="top"
                spacing={12}
                modifiers={[padding({ top: 8, bottom: 10 })]}
            >
                {team('blue')}
                {team('red')}
            </HStack>
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
                moves.slice(0, 5).map((m, i) => (
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
                            // the side that just scored in its color
                            <HStack spacing={2}>
                                {m.score.split('–').map((value, side) => (
                                    <Text
                                        key={String(side)}
                                        modifiers={[
                                            font({
                                                weight: 'bold',
                                                size: 13,
                                            }),
                                            monospacedDigit(),
                                            foregroundStyle(
                                                (side === 0
                                                    ? 'blue'
                                                    : 'red') === m.team
                                                    ? colorOf(m.team)
                                                    : GRAY
                                            ),
                                        ]}
                                    >
                                        {side === 0 ? `${value}–` : value}
                                    </Text>
                                ))}
                            </HStack>
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
        ? createWidget(
              'LiveMatchesWidget',
              // the babel plugin turned the layout into its source; this phone's avatar copies
              // are where the widget extension can read them
              (LiveMatchesWidget as unknown as string).replace(
                  AVATARS_DIRECTORY,
                  activityAvatarsDirectory(widgetsDirectory)
              ) as unknown as typeof LiveMatchesWidget
          )
        : null;

/**
 * how long the widget shows matches it heard nothing more about: iOS may drop the API's pushes,
 * so the end of a match may never reach it
 */
const SHOWN_MS = 45 * 60 * 1000;

export function showLiveMatches(next: LiveMatchesWidgetProps) {
    if (!liveMatchesWidget) return;
    // the widget's storage (UserDefaults) can't hold undefined or null, so both are left out
    const props = JSON.parse(
        JSON.stringify(next, (_key, value: unknown) => value ?? undefined)
    ) as LiveMatchesWidgetProps;
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
