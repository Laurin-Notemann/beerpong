import React from 'react';
import { TouchableOpacity, View, ViewProps } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import Avatar from '@/components/Avatar';
import Text from '@/components/Text';
import {
    getRankingAlgorithm,
    type Placement,
    type RankingAlgorithm,
} from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';
import { formatPlacement, plural } from '@/utils/format';

const Description: React.FC<{
    detailed?: boolean;
    player?: { name: string; points: number; matches: number };
    average: string;
}> = ({ detailed, player, average }) => {
    const theme = useTheme();

    return (
        <>
            <Text
                style={{
                    fontSize: 15,
                    lineHeight: 24,
                    color: theme.color.text.primary,
                    marginTop: 12,

                    textAlign: 'center',
                }}
            >
                {player?.name}
            </Text>

            {detailed && player && (
                <>
                    <Text
                        style={{
                            fontSize: 22,
                            lineHeight: 24,
                            color: theme.color.text.primary,
                        }}
                    >
                        {average}
                    </Text>
                    <Text
                        style={{
                            fontSize: 13,
                            lineHeight: 16,
                            color: theme.color.text.secondary,
                            marginTop: 17,
                        }}
                    >
                        {plural(player.points, 'point', 'points')}
                    </Text>

                    <Text
                        style={{
                            fontSize: 13,
                            lineHeight: 16,
                            color: theme.color.text.secondary,
                        }}
                    >
                        {plural(player.matches, 'match', 'matches')}
                    </Text>
                </>
            )}
        </>
    );
};

type PodiumPlace = { player: Player; placement: Placement };

export interface PodiumProps extends ViewProps {
    detailed?: boolean;

    /** the first three of `rankPlayers` */
    places: PodiumPlace[];

    onPlayerPress?: (id: string) => void;
    rankingAlgorithm: RankingAlgorithm;
}

/**
 * The top three, the leader in the middle. Spots follow the golf-style rank,
 * so a tie for first puts two players on the top step.
 */
export default function Podium({
    detailed = true,
    places,

    onPlayerPress,
    rankingAlgorithm,
    ...rest
}: PodiumProps) {
    const theme = useTheme();

    const numFirst = places.filter((i) => i.placement.rank === 1).length;

    return (
        <View
            {...rest}
            style={[
                {
                    flexDirection: 'row',

                    marginTop: 24,
                },
                rest.style,
            ]}
        >
            {/* left, middle, right */}
            {([1, 0, 2] as const).map((idx) => {
                const place = places[idx];
                const player = place?.player;
                const placement = place?.placement ?? {
                    rank: idx + 1,
                    tied: false,
                };
                const isFirst = placement.rank === 1;

                return (
                    <TouchableOpacity
                        key={idx}
                        disabled={player == null || !onPlayerPress}
                        activeOpacity={0.6}
                        onPress={() => player && onPlayerPress?.(player.id)}
                        style={{
                            alignItems: 'center',
                            marginTop: isFirst ? 0 : 48,
                            flex: 1,

                            // a lone leader overlaps 2nd and 3rd place by 24px
                            ...(isFirst && {
                                zIndex: 1,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                            }),

                            opacity: player ? 1 : 0.2,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 22,
                                lineHeight: 24,
                                color: theme.color.text.secondary,
                                marginBottom: 16,
                            }}
                        >
                            {formatPlacement(placement)}
                        </Text>
                        <Avatar
                            url={player?.avatarUrl}
                            name={player?.name}
                            // shared first places shrink so they fit side by side
                            size={isFirst ? (numFirst > 1 ? 104 : 128) : 96}
                        />
                        <Description
                            detailed={detailed}
                            player={player}
                            average={getRankingAlgorithm(
                                rankingAlgorithm
                            ).getDisplayValue(player)}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
