import {
    Circle,
    HStack,
    Image,
    Spacer,
    Text,
    VStack,
    ZStack,
} from '@expo/ui/swift-ui';
import {
    clipShape,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    monospacedDigit,
    offset,
    padding,
    resizable,
} from '@expo/ui/swift-ui/modifiers';
import {
    createLiveActivity,
    type LiveActivityEnvironment,
    widgetsDirectory,
} from 'expo-widgets';
import { Platform } from 'react-native';

import { activityAvatarsDirectory } from '@/lib/widgets/activityAvatars';
import type {
    ActivityPlayer,
    LiveMatchActivityProps,
} from '@/lib/widgets/props';

/** `avatarsDirectory` in the layout's source, which only knows its props */
const AVATARS_DIRECTORY = '__VERSUS_ACTIVITY_AVATARS__';

/**
 * A live match on the Lock Screen and in the Dynamic Island: blue's score and red's, as the
 * dock shows them, with the time since the start, each team's cups as Versus TV draws them and
 * the players' avatars (initials until this phone has a copy, see activityAvatars.ts). Like the widget, it runs in the widget
 * extension's own JS runtime and only knows its props; the API's pushes start it and keep it
 * up to date (live_activities.go).
 */
const LiveMatchActivity = (
    props: LiveMatchActivityProps,
    environment: LiveActivityEnvironment
) => {
    'widget';
    // the app puts its directory here when it registers the layout (createLiveActivity below)
    const avatarsDirectory = '__VERSUS_ACTIVITY_AVATARS__';
    // theme.color.team and theme.color.positive
    const BLUE = '#18A0FB';
    const RED = '#EE4A58';
    const LIVE = environment.isLuminanceReduced ? '#FFFFFF' : '#1BC097';
    const secondary = foregroundStyle({
        type: 'hierarchical',
        style: 'secondary',
    });
    const score = (value: number, color: string, size: number) => (
        <Text
            modifiers={[
                font({ weight: 'bold', size, design: 'rounded' }),
                monospacedDigit(),
                foregroundStyle(color),
            ]}
        >
            {String(value)}
        </Text>
    );
    const status = (size: number) =>
        props.finished ? (
            <Text modifiers={[font({ weight: 'semibold', size }), secondary]}>
                Final
            </Text>
        ) : (
            <HStack spacing={6}>
                <Text
                    modifiers={[
                        font({ weight: 'bold', size }),
                        foregroundStyle(LIVE),
                    ]}
                >
                    LIVE
                </Text>
                <Text
                    date={new Date(props.startedAt)}
                    dateStyle="timer"
                    modifiers={[font({ size }), monospacedDigit(), secondary]}
                />
            </HStack>
        );
    /** a team's cups: blue's apex points right, red's left, like the TV; hit cups stay faint */
    const rack = (code: string | undefined, team: 'blue' | 'red', cell: number) => {
        const cups = (code ?? '').match(/.{3}/g) ?? [];
        if (!cups.length) return null;
        const color = team === 'blue' ? BLUE : RED;
        return (
            <ZStack modifiers={[frame({ width: cell * 8, height: cell * 8 })]}>
                {cups.map((cup) => {
                    const x = Number(cup[0]);
                    const y = Number(cup[1]);
                    const column = team === 'blue' ? y : 6 - y;
                    return (
                        <Circle
                            key={cup.slice(0, 2)}
                            modifiers={[
                                foregroundStyle(
                                    cup[2] === '1' ? color : '#FFFFFF26'
                                ),
                                frame({ width: cell * 1.8, height: cell * 1.8 }),
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
    /** a team's players, overlapping a little; the avatar covers the initials when it's there */
    const avatars = (
        players: ActivityPlayer[] | undefined,
        color: string,
        size: number
    ) =>
        players?.length ? (
            <HStack spacing={-size / 4}>
                {players.map((player, idx) => (
                    <ZStack key={idx}>
                        <Circle
                            modifiers={[
                                foregroundStyle(color),
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
                ))}
            </HStack>
        ) : null;
    const names = (
        value: string,
        color: string,
        alignment: 'leading' | 'trailing'
    ) => (
        <Text
            modifiers={[
                font({ weight: 'semibold', size: 15 }),
                foregroundStyle(color),
                lineLimit(2),
                frame({ maxWidth: Infinity, alignment }),
            ]}
        >
            {value}
        </Text>
    );

    return {
        banner: (
            <VStack spacing={10} modifiers={[padding({ all: 16 })]}>
                <HStack>
                    {status(13)}
                    <Spacer />
                    <Text modifiers={[font({ size: 13 }), secondary]}>
                        Versus
                    </Text>
                </HStack>
                <HStack spacing={10}>
                    {rack(props.blueCups, 'blue', 5)}
                    <VStack alignment="leading" spacing={4}>
                        {avatars(props.bluePlayers, BLUE, 22)}
                        {names(props.blueNames, BLUE, 'leading')}
                    </VStack>
                    <HStack spacing={6}>
                        {score(props.blueScore, BLUE, 34)}
                        <Text modifiers={[font({ size: 28 }), secondary]}>
                            –
                        </Text>
                        {score(props.redScore, RED, 34)}
                    </HStack>
                    <VStack alignment="trailing" spacing={4}>
                        {avatars(props.redPlayers, RED, 22)}
                        {names(props.redNames, RED, 'trailing')}
                    </VStack>
                    {rack(props.redCups, 'red', 5)}
                </HStack>
            </VStack>
        ),
        compactLeading: score(props.blueScore, BLUE, 15),
        compactTrailing: score(props.redScore, RED, 15),
        minimal: (
            <HStack spacing={3}>
                {score(props.blueScore, BLUE, 12)}
                {score(props.redScore, RED, 12)}
            </HStack>
        ),
        expandedLeading: (
            <VStack
                alignment="leading"
                spacing={2}
                modifiers={[padding({ leading: 6 })]}
            >
                {score(props.blueScore, BLUE, 30)}
                <Text modifiers={[font({ size: 12 }), secondary, lineLimit(1)]}>
                    {props.blueNames}
                </Text>
            </VStack>
        ),
        expandedTrailing: (
            <VStack
                alignment="trailing"
                spacing={2}
                modifiers={[padding({ trailing: 6 })]}
            >
                {score(props.redScore, RED, 30)}
                <Text modifiers={[font({ size: 12 }), secondary, lineLimit(1)]}>
                    {props.redNames}
                </Text>
            </VStack>
        ),
        expandedCenter: status(13),
        expandedBottom: (
            <HStack modifiers={[padding({ horizontal: 6 })]}>
                {rack(props.blueCups, 'blue', 4)}
                {avatars(props.bluePlayers, BLUE, 20)}
                <Spacer />
                {avatars(props.redPlayers, RED, 20)}
                {rack(props.redCups, 'red', 4)}
            </HStack>
        ),
    };
};

/** null where there are no Live Activities (Android) */
export const liveMatchActivity =
    Platform.OS === 'ios'
        ? createLiveActivity(
              'LiveMatchActivity',
              // the babel plugin turned the layout into its source; this phone's avatar copies
              // are where the widget extension can read them
              (LiveMatchActivity as unknown as string).replace(
                  AVATARS_DIRECTORY,
                  activityAvatarsDirectory(widgetsDirectory)
              ) as unknown as typeof LiveMatchActivity
          )
        : null;
