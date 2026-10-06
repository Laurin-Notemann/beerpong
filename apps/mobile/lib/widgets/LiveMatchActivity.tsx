import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
    font,
    foregroundStyle,
    frame,
    lineLimit,
    monospacedDigit,
    padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import { Platform } from 'react-native';

import type { LiveMatchActivityProps } from '@/lib/widgets/props';

/**
 * A live match on the Lock Screen and in the Dynamic Island: blue's score and red's, as the
 * dock shows them, with the time since the start. Like the widget, it runs in the widget
 * extension's own JS runtime and only knows its props; the API's pushes start it and keep it
 * up to date (live_activities.go).
 */
const LiveMatchActivity = (
    props: LiveMatchActivityProps,
    environment: LiveActivityEnvironment
) => {
    'widget';
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
                <HStack spacing={12}>
                    {names(props.blueNames, BLUE, 'leading')}
                    <HStack spacing={6}>
                        {score(props.blueScore, BLUE, 34)}
                        <Text modifiers={[font({ size: 28 }), secondary]}>
                            –
                        </Text>
                        {score(props.redScore, RED, 34)}
                    </HStack>
                    {names(props.redNames, RED, 'trailing')}
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
    };
};

/** null where there are no Live Activities (Android) */
export const liveMatchActivity =
    Platform.OS === 'ios'
        ? createLiveActivity('LiveMatchActivity', LiveMatchActivity)
        : null;
