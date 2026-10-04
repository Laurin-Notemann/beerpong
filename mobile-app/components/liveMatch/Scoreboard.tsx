import { Text, View } from 'react-native';

import { ScoreChip } from '@/components/liveMatch/ScoreChip';
import { TeamBadge, TeamBadgePlayer } from '@/components/liveMatch/TeamBadge';
import { useNextTokens } from '@/components/next/tokens';

/**
 * The live score in one card: red badge and score on the left, blue on the right. The badges
 * share what's left after the scores, so long names ellipsize and the scores never move.
 */
export function Scoreboard({
    red,
    blue,
}: {
    red: { players: TeamBadgePlayer[]; score: number };
    blue: { players: TeamBadgePlayer[]; score: number };
}) {
    const t = useNextTokens();

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 10,
                borderRadius: t.radius,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: t.hairline,
                backgroundColor: t.surface,
            }}
        >
            <View style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <TeamBadge team="red" players={red.players} />
            </View>
            <ScoreChip team="red" value={red.score} />
            <Text style={{ color: t.textSecondary, fontSize: 17 }}>–</Text>
            <ScoreChip team="blue" value={blue.score} />
            <View style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <TeamBadge team="blue" players={blue.players} align="end" />
            </View>
        </View>
    );
}
