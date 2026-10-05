import { Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import {
    GroupLiveMatch,
    useLiveMatchTeams,
} from '@/api/liveMatch/useGroupLiveMatches';
import { LiveDot } from '@/components/liveMatch/LiveDot';
import { LiveTimer } from '@/components/liveMatch/LiveTimer';
import { pressFeedback } from '@/components/liveMatch/motion';
import { Scoreboard } from '@/components/liveMatch/Scoreboard';
import { useNextTokens } from '@/components/next/tokens';
import PressableScale from '@/components/PressableScale';
import { dockLabel } from '@/lib/liveMatch/dock';

/**
 * One live match in the live matches sheet: live dot and timer (and "Not synced yet" while
 * the server doesn't have it, "In the dock" for the one the dock shows), over the match's
 * scoreboard card.
 */
export function LiveMatchRow({
    groupId,
    match,
    isShown,
    onPress,
}: {
    groupId: string;
    match: GroupLiveMatch;
    isShown: boolean;
    onPress: () => void;
}) {
    const t = useNextTokens();
    const reducedMotion = useReducedMotion();
    const { red, blue } = useLiveMatchTeams(groupId, match);

    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: isShown }}
            accessibilityHint="Shows it in the dock"
            accessibilityLabel={
                dockLabel({
                    count: 1,
                    blueScore: blue.score,
                    redScore: red.score,
                }) + (match.isPendingCreate ? '. Not synced yet' : '')
            }
            {...pressFeedback(reducedMotion)}
            style={{ gap: 8 }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 4,
                }}
            >
                <LiveDot />
                <LiveTimer startedAt={match.startedAt} />
                <View style={{ flex: 1 }} />
                {match.isPendingCreate && (
                    <Text
                        numberOfLines={1}
                        style={{ color: t.textSecondary, fontSize: 12 }}
                    >
                        Not synced yet
                    </Text>
                )}
                {isShown && (
                    <Text
                        numberOfLines={1}
                        style={{ color: t.textSecondary, fontSize: 12 }}
                    >
                        In the dock
                    </Text>
                )}
            </View>
            <Scoreboard red={red} blue={blue} />
        </PressableScale>
    );
}
