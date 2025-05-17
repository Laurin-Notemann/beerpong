import { Text, View } from 'react-native';

import { Match } from '@/api/utils/matchDtoToMatch';
import { theme } from '@/theme';

import Avatar from './Avatar';
import PlayerStats from './PlayerStats';

export function PlayerPageHeadSection({
    avatarUrl,
    placement,
    name,
    onUploadAvatarPress,
    cups,
    matchesWon,
    matches,
    elo,
    points,

    isUnranked,
    editable,
    averagePointsPerMatch,
}: {
    avatarUrl?: string | null;
    placement: number;
    name: string;
    onUploadAvatarPress: () => void;
    cups: number;
    matchesWon: number;
    matches: Match[];
    elo: number;
    points: number;

    isUnranked: boolean;
    editable: boolean;
    averagePointsPerMatch: string;
}) {
    return (
        <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
            <Avatar
                url={avatarUrl}
                size={96}
                style={{ marginTop: 32, marginBottom: 8 }}
                placement={placement}
                isUnranked={isUnranked}
                name={name}
                canUpload={editable}
                onPress={editable ? onUploadAvatarPress : undefined}
            />
            <Text
                style={{
                    fontSize: 15,
                    color: theme.color.text.secondary,
                }}
            >
                {averagePointsPerMatch}
            </Text>
            <Text
                style={{
                    fontSize: 25,
                    color: theme.color.text.primary,

                    marginBottom: 32,

                    textAlign: 'center',
                }}
            >
                {name}
            </Text>

            <PlayerStats
                totalCups={cups}
                totalPoints={points}
                matchesWonCount={matchesWon}
                matchesPlayedCount={matches.length}
                elo={elo}
            />
        </View>
    );
}
