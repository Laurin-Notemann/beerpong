import { TouchableOpacity } from 'react-native';

import { useNavigation } from '@/app/navigation/useNavigation';
import { theme } from '@/theme';
import { formatPlacement } from '@/utils/format';

import Avatar from '../Avatar';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

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
}: LeaderboardPlayerItemProps) {
    // account for division by zero
    const averagePointsPerMatch = matches
        ? (points / matches).toFixed(1)
        : '--';

    const nav = useNavigation();

    return (
        // <Link
        //   to={{
        //     params: {
        //       id: "#",
        //     },
        //     screen: "rules",
        //   }}
        // >
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                alignItems: 'center',

                height: 60.5,
                paddingHorizontal: 20,

                opacity: unranked ? 0.5 : undefined,
            }}
            onPress={() => nav.navigate('player', { id })}
        >
            <ThemedText
                style={{
                    marginRight: 12,

                    fontSize: 15,
                    color: theme.color.text.secondary,
                }}
            >
                {formatPlacement(placement)}
            </ThemedText>
            <Avatar url={avatarUrl} name={name} size={36} />
            <ThemedView
                style={{
                    marginLeft: 12,
                }}
            >
                <ThemedText
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
                {averagePointsPerMatch}
            </ThemedText>
        </TouchableOpacity>
        // </Link>
    );
}
