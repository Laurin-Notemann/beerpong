import dayjs from 'dayjs';
import { View } from 'react-native';

import { env } from '@/api/env';
import Text from '@/components/Text';
import { useTheme } from '@/theme';

export interface LeaderboardSeasonInfoProps {
    /**
     * if this is not set, we don't show the name of the season.
     * defaults to false
     */
    isCurrentSeason?: boolean;
    /**
     * if this is not set and `isCurrentSeason` is false, shows "Unknown Season"
     */
    name?: string;
    startDate: string;
    endDate?: string;

    numPlayers: number;
    numMatches: number;
}
export const LeaderBoardSeasonInfo = ({
    isCurrentSeason = false,
    name,
    startDate,
    endDate,
    numPlayers,
    numMatches,
}: LeaderboardSeasonInfoProps) => {
    const theme = useTheme();
    return (
        <View style={{ alignItems: 'center' }}>
            {!isCurrentSeason && (
                <Text
                    style={{
                        fontWeight: 'bold',
                        fontSize: 25,
                        color: theme.color.text.primary,
                        marginTop: 48,
                    }}
                >
                    {name || 'Unknown Season'}
                </Text>
            )}
            {endDate && (
                <Text
                    style={{
                        fontSize: 12,
                        color: theme.color.text.secondary,
                        marginTop: 3,
                    }}
                >
                    {env.format.date.seasonStartAndEnd(dayjs(startDate))} -{' '}
                    {env.format.date.seasonStartAndEnd(dayjs(endDate))}
                </Text>
            )}
            <Text
                style={{
                    fontSize: 17,
                    color: theme.color.text.secondary,
                    marginTop: 32 - 6,
                }}
            >
                {numPlayers} {numPlayers === 1 ? 'player' : 'players'} ·{' '}
                {numMatches} {numMatches === 1 ? 'match' : 'matches'}
            </Text>
        </View>
    );
};
