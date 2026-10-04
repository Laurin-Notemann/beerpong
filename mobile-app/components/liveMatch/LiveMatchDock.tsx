import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/native-tabs';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, {
    FadeIn,
    LayoutAnimationConfig,
    useReducedMotion,
} from 'react-native-reanimated';

import { useLiveMatchTeams } from '@/api/liveMatch/useGroupLiveMatches';
import { LiveDot } from '@/components/liveMatch/LiveDot';
import { LiveTimer } from '@/components/liveMatch/LiveTimer';
import {
    EASE_OUT,
    ENTER_MS,
    floatIn,
    floatOut,
    popIn,
    popOut,
    pressFeedback,
} from '@/components/liveMatch/motion';
import { ScoreChip } from '@/components/liveMatch/ScoreChip';
import { TeamBadge } from '@/components/liveMatch/TeamBadge';
import { useNextTokens, withAlpha } from '@/components/next/tokens';
import PressableScale from '@/components/PressableScale';
import { dockBadgeLayout, dockLabel } from '@/lib/liveMatch/dock';
import type { LiveMatchDockSnapshot } from '@/lib/liveMatch/useLiveMatchDock';
import { useInsets } from '@/lib/useInsets';

/**
 * Where the dock lives. With Liquid Glass (iOS 26+, built with the iOS 26 SDK, not opted out)
 * it's the tab bar's native bottom accessory; everywhere else (Android, older iOS) it floats
 * above the tab bar. `isLiquidGlassAvailable()` is the signal the tab layout already uses, and
 * it implies everything the accessory needs, so both places agree on one answer.
 */
export const DOCK_IN_TAB_BAR = isLiquidGlassAvailable();

const FLOATING_HEIGHT = 56;
const FLOATING_GAP = 8;
/** how much higher a tab's content has to end while the floating dock shows */
export const FLOATING_DOCK_INSET = FLOATING_HEIGHT + 2 * FLOATING_GAP;

interface DockProps {
    snapshot: LiveMatchDockSnapshot;
    onPress: () => void;
}

interface RowProps {
    snapshot: LiveMatchDockSnapshot;
    teams: ReturnType<typeof useLiveMatchTeams>;
}

/** "+2": how many more matches are live than the one shown */
function MoreChip({ count }: { count: number }) {
    const t = useNextTokens();
    const reducedMotion = useReducedMotion();

    return (
        <Animated.View
            entering={popIn(reducedMotion)}
            exiting={popOut(reducedMotion)}
            style={{
                height: 24,
                minWidth: 28,
                paddingHorizontal: 7,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: withAlpha(t.text, t.isLight ? 0.08 : 0.14),
            }}
        >
            <Text
                style={{
                    color: t.text,
                    fontSize: 13,
                    fontWeight: '600',
                    fontVariant: ['tabular-nums'],
                }}
            >
                +{count}
            </Text>
        </Animated.View>
    );
}

/**
 * The regular dock: live dot and timer, then blue badge, score – score, red badge (as in
 * `Scoreboard`), then "+N" when more matches are live. The scores sit in the middle of the
 * space between timer and "+N"; the badges give way (`dockBadgeLayout`: names only where they
 * fit, fewer avatars on narrow phones), so the scores never move.
 */
function DockRow({ snapshot, teams }: RowProps) {
    const t = useNextTokens();
    const { width } = useWindowDimensions();
    const { primary, count } = snapshot;
    const { red, blue } = teams;
    const { maxAvatars, showNames } = dockBadgeLayout({
        windowWidth: width,
        largestTeam: Math.max(red.players.length, blue.players.length),
        count,
    });

    return (
        // Another match fades in as a whole: its own row, so the scores don't roll as if a cup
        // changed. The first one just shows (see the docks' `skipEntering`)
        <Animated.View
            key={primary.id}
            entering={FadeIn.duration(ENTER_MS).easing(EASE_OUT)}
            style={{ flex: 1 }}
        >
            {/* the "+N" only animates when the count changes, not with the dock itself */}
            <LayoutAnimationConfig skipEntering skipExiting>
                <View
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            flexShrink: 0,
                        }}
                    >
                        <LiveDot />
                        <LiveTimer startedAt={primary.startedAt} />
                    </View>
                    <View
                        style={{
                            flex: 1,
                            minWidth: 0,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <View
                            style={{
                                flex: 1,
                                minWidth: 0,
                                alignItems: 'flex-end',
                                overflow: 'hidden',
                            }}
                        >
                            <TeamBadge
                                team="blue"
                                players={blue.players}
                                size="compact"
                                maxAvatars={maxAvatars}
                                showNames={showNames}
                            />
                        </View>
                        <ScoreChip
                            team="blue"
                            value={blue.score}
                            size="compact"
                        />
                        <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                            –
                        </Text>
                        <ScoreChip
                            team="red"
                            value={red.score}
                            size="compact"
                        />
                        <View
                            style={{
                                flex: 1,
                                minWidth: 0,
                                alignItems: 'flex-start',
                                overflow: 'hidden',
                            }}
                        >
                            <TeamBadge
                                team="red"
                                players={red.players}
                                size="compact"
                                align="end"
                                maxAvatars={maxAvatars}
                                showNames={showNames}
                            />
                        </View>
                    </View>
                    {count > 1 && <MoreChip count={count - 1} />}
                </View>
            </LayoutAnimationConfig>
        </Animated.View>
    );
}

/** The minimized tab bar's slim dock: live dot, "LIVE", timer, the score (blue–red), "+N". */
function InlineDockRow({ snapshot, teams }: RowProps) {
    const t = useNextTokens();
    const score = {
        fontSize: 14,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    } as const;

    return (
        <View
            style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
            }}
        >
            <LiveDot size={6} />
            <Text
                style={{
                    color: t.theme.color.positive,
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.6,
                }}
            >
                LIVE
            </Text>
            <LiveTimer startedAt={snapshot.primary.startedAt} />
            <Text numberOfLines={1} style={{ color: t.textSecondary }}>
                <Text style={[score, { color: t.blue }]}>
                    {teams.blue.score}
                </Text>
                <Text style={{ fontSize: 14 }}>–</Text>
                <Text style={[score, { color: t.red }]}>{teams.red.score}</Text>
            </Text>
            {snapshot.count > 1 && (
                <Text
                    style={{
                        color: t.textSecondary,
                        fontSize: 13,
                        fontWeight: '600',
                    }}
                >
                    +{snapshot.count - 1}
                </Text>
            )}
        </View>
    );
}

/** the dock's teams, and what screen readers say for it */
function useDock(snapshot: LiveMatchDockSnapshot) {
    const teams = useLiveMatchTeams(snapshot.groupId, snapshot.primary);
    const label = dockLabel({
        count: snapshot.count,
        blueScore: teams.blue.score,
        redScore: teams.red.score,
    });
    return { teams, label };
}

/**
 * Content of `NativeTabs.BottomAccessory`. iOS renders it twice (regular and inline) and shows
 * one, so it keeps no data of its own: everything comes in through props.
 */
export function LiveMatchAccessory({ snapshot, onPress }: DockProps) {
    const placement = NativeTabs.BottomAccessory.usePlacement();
    const reducedMotion = useReducedMotion();
    const { teams, label } = useDock(snapshot);

    return (
        <PressableScale
            {...pressFeedback(reducedMotion)}
            accessibilityRole="button"
            onPress={onPress}
            accessibilityLabel={label}
            pressableStyle={{ flex: 1 }}
            style={{
                flex: 1,
                justifyContent: 'center',
                paddingHorizontal: placement === 'inline' ? 10 : 16,
            }}
        >
            <LayoutAnimationConfig skipEntering>
                {placement === 'inline' ? (
                    <InlineDockRow snapshot={snapshot} teams={teams} />
                ) : (
                    <DockRow snapshot={snapshot} teams={teams} />
                )}
            </LayoutAnimationConfig>
        </PressableScale>
    );
}

/**
 * The dock where there's no bottom accessory: a pill floating 8 pt above the tab bar, on the
 * card surface with a hairline border and a soft shadow. It rises in on a spring and sinks out
 * faster; under reduced motion it only fades. Mounted per tab stack, which also tells the tab's
 * screens to leave room for it (`FLOATING_DOCK_INSET`).
 */
export function FloatingLiveMatchDock({
    snapshot,
    onPress,
}: {
    snapshot: LiveMatchDockSnapshot | undefined;
    onPress: () => void;
}) {
    const reducedMotion = useReducedMotion();
    // the bottom of the tab's content, i.e. the top of the tab bar
    const tabBarTop = useInsets(false, true).bottom;

    return (
        // already showing when a tab first opens: no entrance then
        <LayoutAnimationConfig skipEntering>
            {snapshot && (
                <Animated.View
                    entering={floatIn(reducedMotion)}
                    exiting={floatOut(reducedMotion)}
                    style={{
                        position: 'absolute',
                        left: 12,
                        right: 12,
                        bottom: tabBarTop + FLOATING_GAP,
                    }}
                >
                    <FloatingDockCard snapshot={snapshot} onPress={onPress} />
                </Animated.View>
            )}
        </LayoutAnimationConfig>
    );
}

function FloatingDockCard({ snapshot, onPress }: DockProps) {
    const t = useNextTokens();
    const reducedMotion = useReducedMotion();
    const { teams, label } = useDock(snapshot);

    return (
        <PressableScale
            {...pressFeedback(reducedMotion)}
            accessibilityRole="button"
            onPress={onPress}
            accessibilityLabel={label}
            style={{
                height: FLOATING_HEIGHT,
                paddingHorizontal: 14,
                justifyContent: 'center',
                borderRadius: FLOATING_HEIGHT / 2,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: t.hairline,
                backgroundColor: t.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: t.isLight ? 0.12 : 0.4,
                shadowRadius: 16,
                elevation: 6,
            }}
        >
            <DockRow snapshot={snapshot} teams={teams} />
        </PressableScale>
    );
}
