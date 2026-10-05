import { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';

import Avatar from '@/components/Avatar';
import Text from '@/components/Text';
import {
    getRankingAlgorithm,
    type Placement,
    type RankingAlgorithm,
} from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';
import { formatPlacement, plural } from '@/utils/format';

/** fixed, so the leaderboard list can position rows without measuring them */
export const LEADERBOARD_ROW_HEIGHT = 60.5;

export interface LeaderboardPlayerItemProps {
    id: string;
    placement: Placement;

    name: string;
    avatarUrl?: string | null;

    matches: number;
    matchesWon: number;
    points: number;
    elo: number;
    unranked?: boolean;

    cups: number;
    avgTeamSize: number;

    onPlayerPress?: (id: string) => void;

    rankingAlgorithm: RankingAlgorithm;
}
function LeaderboardPlayerItem({
    id,
    placement,
    name,
    avatarUrl,
    matches,
    matchesWon,
    points,
    elo,
    unranked = false,
    onPlayerPress,
    rankingAlgorithm,
    cups,
    avgTeamSize,
}: LeaderboardPlayerItemProps) {
    const theme = useTheme();

    return (
        <TouchableOpacity
            disabled={!onPlayerPress}
            style={{
                flexDirection: 'row',
                alignItems: 'center',

                height: LEADERBOARD_ROW_HEIGHT,
                paddingHorizontal: 20,

                opacity: unranked ? 0.5 : undefined,
            }}
            onPress={() => onPlayerPress?.(id)}
        >
            <Text
                style={{
                    marginRight: 12,

                    fontSize: 15,
                    color: theme.color.text.secondary,
                }}
            >
                {matches ? formatPlacement(placement) : '  '}
            </Text>
            <Avatar url={avatarUrl} name={name} size={36} />
            <View
                style={{
                    marginLeft: 12,

                    flex: 1,
                }}
            >
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 17,
                        fontWeight: 500,
                        color: theme.color.text.primary,
                    }}
                >
                    {name}
                </Text>
                <Text
                    style={{ fontSize: 15, color: theme.color.text.secondary }}
                >
                    {plural(points, 'point', 'points')} ·{' '}
                    {plural(matches, 'match', 'matches')}
                </Text>
            </View>
            <Text
                style={{
                    marginLeft: 'auto',

                    fontSize: 15,
                    color: theme.color.text.secondary,
                }}
            >
                {getRankingAlgorithm(rankingAlgorithm).getDisplayValue({
                    avatarUrl,
                    name,
                    cups,
                    avgTeamSize,
                    matchesWon,
                    matches: matches,
                    elo,
                    points,
                })}
            </Text>
        </TouchableOpacity>
    );
}

// Rows only change when their player's numbers change; the list re-renders often.
export default memo(LeaderboardPlayerItem);
