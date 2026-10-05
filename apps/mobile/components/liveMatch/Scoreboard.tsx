import { Text, View } from 'react-native';

import { ScoreChip } from '@/components/liveMatch/ScoreChip';
import { TeamBadge, TeamBadgePlayer } from '@/components/liveMatch/TeamBadge';
import { useNextTokens } from '@/components/next/tokens';
import { teamNames } from '@/lib/liveMatch/labels';

/**
 * The live score in one card: blue badge and score on the left, red on the right (as in
 * `MatchVsHeader`). The badges share what's left after the scores, so long names ellipsize and
 * the scores never move. Screen readers read it as one line: "Blue: Anna & Ben, 3. Red: …".
 */
export function Scoreboard({
    red,
    blue,
}: {
    red: { players: TeamBadgePlayer[]; score: number };
    blue: { players: TeamBadgePlayer[]; score: number };
}) {
    const t = useNextTokens();
    const label = (name: string, team: typeof red) =>
        `${name}: ${teamNames(team.players.map((i) => i.name))}, ${team.score}`;

    return (
        <View
            accessible
            accessibilityLabel={`${label('Blue', blue)}. ${label('Red', red)}`}
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
                <TeamBadge team="blue" players={blue.players} />
            </View>
            <ScoreChip team="blue" value={blue.score} />
            <Text style={{ color: t.textSecondary, fontSize: 17 }}>–</Text>
            <ScoreChip team="red" value={red.score} />
            <View style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <TeamBadge team="red" players={red.players} align="end" />
            </View>
        </View>
    );
}
