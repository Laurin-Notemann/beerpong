import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { TvMatch } from '@/api/calls/tvHooks';
import { Icon, IconName } from '@/components/Icon';
import { LiveTimer } from '@/components/liveMatch/LiveTimer';
import { useNextTokens, withAlpha } from '@/components/next/tokens';
import { triggerHapticBump } from '@/haptics';
import { Scope, Screen } from '@/lib/tvDisplay';

// The TV remote's building blocks. Every section is the same: a heading, one card of rows, and
// small print under it; the TV's green marks what's chosen.

export function useRemoteTokens() {
    const t = useNextTokens();
    const accent = t.theme.color.positive;
    return { ...t, accent, accentTint: withAlpha(accent, 0.14) };
}

/** a heading, its rows and the small print under them */
export function Section({
    title,
    footer,
    children,
}: {
    title?: string;
    footer?: React.ReactNode;
    children?: React.ReactNode;
}) {
    const t = useRemoteTokens();
    return (
        <View style={{ gap: 8 }}>
            {title && (
                <Text
                    style={{
                        color: t.textSecondary,
                        fontSize: 13,
                        fontWeight: '600',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        paddingHorizontal: 16,
                    }}
                >
                    {title}
                </Text>
            )}
            {children}
            {footer && <Hint>{footer}</Hint>}
        </View>
    );
}

/** small print, in line with the rows' text */
export function Hint({ children }: { children: React.ReactNode }) {
    const t = useRemoteTokens();
    return (
        <Text
            style={{
                color: t.textSecondary,
                fontSize: 13,
                lineHeight: 18,
                paddingHorizontal: 16,
            }}
        >
            {children}
        </Text>
    );
}

/** rows in one card, with hairlines between them */
export function Card({ children }: { children: React.ReactNode }) {
    const t = useRemoteTokens();
    const rows = React.Children.toArray(children);
    return (
        <View
            style={{
                borderRadius: 16,
                borderCurve: 'continuous',
                backgroundColor: t.surface,
                overflow: 'hidden',
            }}
        >
            {rows.map((row, idx) => (
                <View key={idx}>
                    {idx > 0 && (
                        <View
                            style={{
                                height: 1,
                                marginLeft: 16,
                                backgroundColor: t.hairline,
                            }}
                        />
                    )}
                    {row}
                </View>
            ))}
        </View>
    );
}

/**
 * One row of a card: an optional icon, a title and subtitle (or `children` in their place) and
 * `trailing` on the right. A press that changes the TV bumps (`haptic`).
 */
export function Row({
    icon,
    title,
    subtitle,
    children,
    trailing,
    onPress,
    selected,
    danger,
    disabled,
    haptic = true,
}: {
    icon?: IconName;
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
    trailing?: React.ReactNode;
    onPress?: () => void;
    selected?: boolean;
    danger?: boolean;
    disabled?: boolean;
    haptic?: boolean;
}) {
    const t = useRemoteTokens();
    const color = danger ? t.theme.color.delete : t.text;

    return (
        <Pressable
            disabled={disabled || !onPress}
            onPress={() => {
                if (haptic) triggerHapticBump('selection');
                onPress?.();
            }}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 52,
                paddingVertical: 10,
                paddingHorizontal: 16,
                backgroundColor: pressed ? t.surfacePressed : undefined,
                opacity: disabled ? 0.4 : 1,
            })}
        >
            {icon && (
                <View
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        borderCurve: 'continuous',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected
                            ? t.accentTint
                            : withAlpha(danger ? color : t.textSecondary, 0.14),
                    }}
                >
                    <Icon
                        name={icon}
                        size={19}
                        color={
                            selected
                                ? t.accent
                                : danger
                                  ? color
                                  : t.textSecondary
                        }
                    />
                </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
                {children ?? (
                    <>
                        <Text
                            numberOfLines={1}
                            style={{
                                color,
                                fontSize: 17,
                                fontWeight: selected ? '600' : '400',
                            }}
                        >
                            {title}
                        </Text>
                        {subtitle && (
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: t.textSecondary,
                                    fontSize: 13,
                                    marginTop: 1,
                                }}
                            >
                                {subtitle}
                            </Text>
                        )}
                    </>
                )}
            </View>
            {trailing}
        </Pressable>
    );
}

export function Radio({ on }: { on: boolean }) {
    const t = useRemoteTokens();
    return (
        <View
            style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: on ? t.accent : withAlpha(t.textSecondary, 0.5),
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
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: picked ? 0 : 1.5,
                borderColor: withAlpha(t.textSecondary, 0.5),
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

/** a chevron, for rows that open something */
export function Chevron() {
    const t = useRemoteTokens();
    return (
        <Icon
            name="chevron-right"
            size={22}
            color={withAlpha(t.textSecondary, 0.7)}
        />
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
                <View style={{ flexDirection: 'row', marginTop: 1 }}>
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
                    fontSize: 20,
                    fontWeight: '800',
                    fontVariant: ['tabular-nums'],
                }}
            >
                <Text style={{ color: t.blue }}>{match.blue.score}</Text>
                <Text style={{ color: t.textSecondary }}> – </Text>
                <Text style={{ color: t.red }}>{match.red.score}</Text>
            </Text>
        </View>
    );
}

/** a row of options, one chosen: the leaderboard's scope */
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
                padding: 3,
                borderRadius: 12,
                borderCurve: 'continuous',
                backgroundColor: t.surface,
            }}
        >
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <Pressable
                        key={o.value}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: on }}
                        onPress={() => {
                            if (on) return;
                            triggerHapticBump('selection');
                            onChange(o.value);
                        }}
                        style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 9,
                            borderCurve: 'continuous',
                            alignItems: 'center',
                            backgroundColor: on
                                ? withAlpha(
                                      t.isLight ? '#000000' : '#FFFFFF',
                                      0.16
                                  )
                                : undefined,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: on ? '600' : '500',
                                color: on ? t.text : t.textSecondary,
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

export const screens: { value: Screen; label: string; icon: IconName }[] = [
    { value: 'auto', label: 'Auto', icon: 'view-split-vertical' },
    { value: 'leaderboard', label: 'Leaderboard', icon: 'podium' },
    { value: 'live', label: 'Live Matches', icon: 'view-grid-outline' },
    { value: 'focus', label: 'One Match', icon: 'fullscreen' },
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
