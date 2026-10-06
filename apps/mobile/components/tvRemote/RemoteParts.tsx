import type React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { TvMatch } from '@/api/calls/tvHooks';
import { LiveTimer } from '@/components/liveMatch/LiveTimer';
import { pressFeedback } from '@/components/liveMatch/motion';
import { useNextTokens, withAlpha } from '@/components/next/tokens';
import PressableScale from '@/components/PressableScale';
import { triggerHapticBump } from '@/haptics';
import { Scope, Screen } from '@/lib/tvDisplay';

// The TV remote's controls, after the web remote (apps/web, routes/tv/remote.$id.tsx): tiles
// for what the TV shows, cards to pick matches with, the TV's green for what's chosen.

export function useRemoteTokens() {
    const t = useNextTokens();
    const accent = t.theme.color.positive;
    return { ...t, accent, accentTint: withAlpha(accent, 0.12) };
}

/** a press that changes the TV: a selection bump, then `onPress` */
const select = (onPress: () => void) => () => {
    triggerHapticBump('selection');
    onPress();
};

export function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    const t = useRemoteTokens();
    return (
        <View style={{ gap: 12 }}>
            <Text
                style={{
                    color: t.textSecondary,
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                }}
            >
                {title}
            </Text>
            {children}
        </View>
    );
}

/** small print under a control */
export function Hint({ children }: { children: React.ReactNode }) {
    const t = useRemoteTokens();
    return (
        <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>
            {children}
        </Text>
    );
}

/** one of the things the TV can show, with a drawing of it */
export function ScreenTile({
    screen,
    label,
    caption,
    selected,
    disabled,
    onPress,
}: {
    screen: Screen;
    label: string;
    caption: string;
    selected: boolean;
    disabled?: boolean;
    onPress: () => void;
}) {
    const t = useRemoteTokens();
    const reducedMotion = useReducedMotion();

    return (
        <PressableScale
            {...pressFeedback(reducedMotion)}
            onPress={select(onPress)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={`${label}, ${caption}`}
            style={{ flex: 1, opacity: disabled ? 0.4 : 1 }}
            pressableStyle={{
                gap: 10,
                padding: 10,
                borderRadius: 18,
                borderCurve: 'continuous',
                borderWidth: 1.5,
                borderColor: selected ? t.accent : t.hairline,
                backgroundColor: selected ? t.accentTint : t.surface,
            }}
        >
            <Sketch screen={screen} active={selected} />
            <View style={{ paddingHorizontal: 2 }}>
                <Text
                    style={{ color: t.text, fontSize: 16, fontWeight: '700' }}
                >
                    {label}
                </Text>
                <Text
                    numberOfLines={1}
                    style={{ color: t.textSecondary, fontSize: 12 }}
                >
                    {caption}
                </Text>
            </View>
        </PressableScale>
    );
}

/** a small drawing of a screen's layout on the TV */
function Sketch({ screen, active }: { screen: Screen; active: boolean }) {
    const t = useRemoteTokens();
    const ink = withAlpha(t.isLight ? '#000000' : '#FFFFFF', 0.35);
    const lines = (n: number) =>
        Array.from({ length: n }, (_, i) => (
            <View
                key={i}
                style={{ height: 3, borderRadius: 2, backgroundColor: ink }}
            />
        ));
    const match = (
        <View
            style={{
                flex: 1,
                flexDirection: 'row',
                gap: 1,
                borderRadius: 3,
                overflow: 'hidden',
            }}
        >
            <View
                style={{ flex: 1, backgroundColor: withAlpha(t.blue, 0.7) }}
            />
            <View style={{ flex: 1, backgroundColor: withAlpha(t.red, 0.7) }} />
        </View>
    );

    return (
        <View
            style={{
                aspectRatio: 16 / 9,
                flexDirection: 'row',
                gap: 6,
                padding: 7,
                borderRadius: 10,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: active ? withAlpha(t.accent, 0.5) : t.hairline,
                backgroundColor: active
                    ? '#000000'
                    : t.isLight
                      ? '#F2F2F5'
                      : '#0E0E10',
            }}
        >
            {screen === 'auto' && (
                <>
                    <View
                        style={{ flex: 1.45, justifyContent: 'space-around' }}
                    >
                        {lines(5)}
                    </View>
                    {match}
                </>
            )}
            {screen === 'leaderboard' && (
                <View style={{ flex: 1, gap: 4 }}>
                    <View
                        style={{
                            height: '50%',
                            flexDirection: 'row',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            gap: 4,
                        }}
                    >
                        {[0.66, 1, 0.5].map((h, i) => (
                            <View
                                key={i}
                                style={{
                                    width: 12,
                                    height: `${h * 100}%`,
                                    borderTopLeftRadius: 2,
                                    borderTopRightRadius: 2,
                                    backgroundColor: i === 1 ? '#F2C14E' : ink,
                                }}
                            />
                        ))}
                    </View>
                    <View
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            gap: 6,
                        }}
                    >
                        {[0, 1].map((col) => (
                            <View
                                key={col}
                                style={{
                                    flex: 1,
                                    justifyContent: 'space-around',
                                }}
                            >
                                {lines(2)}
                            </View>
                        ))}
                    </View>
                </View>
            )}
            {screen === 'live' && (
                <>
                    {match}
                    {match}
                </>
            )}
            {screen === 'focus' && match}
        </View>
    );
}

/** a card of a single or multiple choice, with its mark on the right */
export function Choice({
    selected,
    onPress,
    mark,
    children,
}: {
    selected: boolean;
    onPress: () => void;
    mark: React.ReactNode;
    children: React.ReactNode;
}) {
    const t = useRemoteTokens();
    const reducedMotion = useReducedMotion();

    return (
        <PressableScale
            {...pressFeedback(reducedMotion)}
            onPress={select(onPress)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            pressableStyle={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 18,
                borderCurve: 'continuous',
                borderWidth: 1.5,
                borderColor: selected ? t.accent : t.hairline,
                backgroundColor: selected ? t.accentTint : t.surface,
            }}
        >
            <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
            {mark}
        </PressableScale>
    );
}

export function Radio({ on }: { on: boolean }) {
    const t = useRemoteTokens();
    return (
        <View
            style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: on ? t.accent : t.hairline,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {on && (
                <View
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: t.accent,
                    }}
                />
            )}
        </View>
    );
}

/** a picked match's place on the TV, or + to pick it */
export function PinMark({ index }: { index: number }) {
    const t = useRemoteTokens();
    const picked = index >= 0;
    return (
        <View
            style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: picked ? 0 : 1,
                borderColor: t.hairline,
                backgroundColor: picked ? t.accent : undefined,
            }}
        >
            <Text
                style={{
                    color: picked ? '#000000' : t.textSecondary,
                    fontSize: 14,
                    fontWeight: '700',
                }}
            >
                {picked ? index + 1 : '+'}
            </Text>
        </View>
    );
}

export const teamNames = (team: TvMatch['blue']) =>
    team.players.map((p) => p.name).join(' & ') || '…';
export const versus = (match: TvMatch) =>
    `${teamNames(match.blue)} vs ${teamNames(match.red)}`;

/** both teams, how long it runs and the score, as on the TV's cards */
export function MatchSummary({
    match,
    onTv,
}: {
    match: TvMatch;
    onTv?: boolean;
}) {
    const t = useRemoteTokens();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: t.blue, fontSize: 15 }}>
                    {teamNames(match.blue)}
                </Text>
                <Text numberOfLines={1} style={{ color: t.red, fontSize: 15 }}>
                    {teamNames(match.red)}
                </Text>
                <View style={{ flexDirection: 'row' }}>
                    <LiveTimer
                        startedAt={match.startedAt}
                        style={{ fontSize: 12 }}
                    />
                    {onTv && (
                        <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                            {' · on the TV'}
                        </Text>
                    )}
                </View>
            </View>
            <Text
                style={{
                    fontSize: 22,
                    fontWeight: '900',
                    fontVariant: ['tabular-nums'],
                }}
            >
                <Text style={{ color: t.blue }}>{match.blue.score}</Text>
                <Text style={{ color: t.textSecondary }}>–</Text>
                <Text style={{ color: t.red }}>{match.red.score}</Text>
            </Text>
        </View>
    );
}

/** a row of options, one chosen, like the web remote's scope switch */
export function Segmented<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
}) {
    const t = useRemoteTokens();
    return (
        <View
            accessibilityRole="tablist"
            style={{
                flexDirection: 'row',
                padding: 4,
                borderRadius: 14,
                borderCurve: 'continuous',
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.hairline,
            }}
        >
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <Pressable
                        key={o.value}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: on }}
                        onPress={select(() => {
                            if (!on) onChange(o.value);
                        })}
                        style={{
                            flex: 1,
                            paddingVertical: 9,
                            borderRadius: 10,
                            borderCurve: 'continuous',
                            alignItems: 'center',
                            backgroundColor: on ? t.text : undefined,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: on
                                    ? t.isLight
                                        ? '#FFFFFF'
                                        : '#000000'
                                    : t.textSecondary,
                            }}
                        >
                            {o.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

/** a full-width button at the bottom of the remote */
export function RemoteButton({
    title,
    onPress,
    danger,
    busy,
}: {
    title: string;
    onPress: () => void;
    danger?: boolean;
    busy?: boolean;
}) {
    const t = useRemoteTokens();
    const reducedMotion = useReducedMotion();
    return (
        <PressableScale
            {...pressFeedback(reducedMotion)}
            onPress={onPress}
            disabled={busy}
            accessibilityRole="button"
            pressableStyle={{
                alignItems: 'center',
                paddingVertical: 14,
                borderRadius: 14,
                borderCurve: 'continuous',
                borderWidth: danger ? 0 : 1,
                borderColor: t.hairline,
                backgroundColor: danger ? undefined : t.surface,
                opacity: busy ? 0.5 : 1,
            }}
        >
            <Text
                style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: danger ? t.theme.color.delete : t.text,
                }}
            >
                {title}
            </Text>
        </PressableScale>
    );
}

export const screens: { value: Screen; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'leaderboard', label: 'Leaderboard' },
    { value: 'live', label: 'Live' },
    { value: 'focus', label: 'One Match' },
];

export const scopes: { value: Scope; label: string }[] = [
    { value: 'season', label: 'Season' },
    { value: 'today', label: 'Today' },
    { value: 'all-time', label: 'All Time' },
];

export const screenLabel = (screen: Screen) =>
    screens.find((i) => i.value === screen)?.label ?? '';
export const scopeLabel = (scope: Scope) =>
    scopes.find((i) => i.value === scope)?.label ?? '';
