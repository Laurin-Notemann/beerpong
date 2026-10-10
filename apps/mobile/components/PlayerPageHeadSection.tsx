import { Text, View } from 'react-native';

import { Match } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import PlayerStats from '@/components/PlayerStats';
import {
    getRankingAlgorithm,
    type Placement,
    type RankingAlgorithm,
} from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';

export function PlayerPageHeadSection({
    avatarUrl,
    profileId = '',
    placement,
    name,
    onUploadAvatarPress,
    cups,
    avgTeamSize,
    matchesWon,
    matches,
    elo,
    points,

    isUnranked,
    editable,
    rankingAlgorithm,
}: {
    avatarUrl?: string | null;
    /** whose stats `matches` are charted for; not needed while editable */
    profileId?: string;
    placement: Placement;
    name: string;
    onUploadAvatarPress: () => void;
    cups: number;
    avgTeamSize: number;
    matchesWon: number;
    matches: Match[];
    elo: number;
    points: number;

    isUnranked: boolean;
    editable: boolean;
    rankingAlgorithm: RankingAlgorithm;
}) {
    const theme = useTheme();

    const player = {
        avatarUrl,
        name,
        cups,
        avgTeamSize,
        matchesWon,
        matches: matches.length,
        elo,
        points,
    };

    return (
        <View style={{ alignItems: 'center' }}>
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
                {!editable &&
                    getRankingAlgorithm(rankingAlgorithm).getDisplayValue(
                        player
                    )}
            </Text>
            <Text
                style={{
                    fontSize: 25,
                    color: theme.color.text.primary,

                    marginBottom: 32,

                    textAlign: 'center',

                    paddingHorizontal: 16,
                }}
            >
                {name}
            </Text>

            {!editable && (
                <PlayerStats
                    player={player}
                    profileId={profileId}
                    matches={matches}
                />
            )}
        </View>
    );
}
