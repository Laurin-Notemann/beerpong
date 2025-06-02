import { TouchableOpacity } from 'react-native';

import Avatar from '@/components/Avatar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/theme';
import { formatPlacement } from '@/utils/format';

export interface LeaderboardPlayerItemProps {
    id: string;
    placement: number;

    name: string;
    avatarUrl?: string | null;

    matches: number;
    matchesWon: number;
    points: number;
    elo: number;
    unranked?: boolean;

    onPlayerPress?: (id: string) => void;
    onPlayerLongPress?: (id: string) => void;

    rankingAlgorithm: 'AVERAGE' | 'ELO';
}
export default function LeaderboardPlayerItem({
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
    onPlayerLongPress,
    rankingAlgorithm,
}: LeaderboardPlayerItemProps) {
    const theme = useTheme();
    // account for division by zero
    const averagePointsPerMatch = matches ? (points / matches).toFixed(1) : '';

    return (
        <TouchableOpacity
            disabled={!onPlayerPress}
            style={{
                flexDirection: 'row',
                alignItems: 'center',

                height: 60.5,
                paddingHorizontal: 20,

                opacity: unranked ? 0.5 : undefined,
            }}
            onPress={() => onPlayerPress?.(id)}
            onLongPress={() => onPlayerLongPress?.(id)}
        >
            <ThemedText
                style={{
                    marginRight: 12,

                    fontSize: 15,
                    color: theme.color.text.secondary,
                }}
            >
                {matches ? formatPlacement(placement) : '  '}
            </ThemedText>
            <Avatar url={avatarUrl} name={name} size={36} />
            <ThemedView
                style={{
                    marginLeft: 12,

                    flex: 1,
                }}
            >
                <ThemedText
                    numberOfLines={1}
                    style={{
                        fontSize: 17,
                        fontWeight: 500,
                        color: theme.color.text.primary,
                    }}
                >
                    {name}
                </ThemedText>
                <ThemedText
                    style={{ fontSize: 15, color: theme.color.text.secondary }}
                >
                    {points} points · {matches} matches
                </ThemedText>
            </ThemedView>
            <ThemedText
                style={{
                    marginLeft: 'auto',

                    fontSize: 15,
                    color: theme.color.text.secondary,
                }}
            >
                {rankingAlgorithm === 'AVERAGE'
                    ? averagePointsPerMatch
                    : elo.toFixed()}
            </ThemedText>
        </TouchableOpacity>
    );
}
