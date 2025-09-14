import React from 'react';
import { TouchableOpacity, ViewProps } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import Avatar from '@/components/Avatar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { RankingAlgorithm } from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';
import {
    formatAverage,
    formatElo,
    formatPlacement,
    formatWinRate,
} from '@/utils/format';

const Description: React.FC<{
    detailed?: boolean;
    player?: { name: string; points: number; matches: number };
    average: string;
}> = ({ detailed, player, average }) => {
    const theme = useTheme();

    return (
        <>
            <ThemedText
                style={{
                    fontSize: 15,
                    color: theme.color.text.primary,
                    marginTop: 12,

                    textAlign: 'center',
                }}
            >
                {player?.name}
            </ThemedText>

            {detailed && player && (
                <>
                    <ThemedText
                        style={{
                            fontSize: 22,
                            color: theme.color.text.primary,
                        }}
                    >
                        {average}
                    </ThemedText>
                    <ThemedText
                        style={{
                            fontSize: 13,
                            color: theme.color.text.secondary,
                            marginTop: 13,
                        }}
                    >
                        {player.points} points
                    </ThemedText>

                    <ThemedText
                        style={{
                            fontSize: 13,
                            color: theme.color.text.secondary,
                            marginTop: -8,
                        }}
                    >
                        {player.matches} matches
                    </ThemedText>
                </>
            )}
        </>
    );
};

export interface PodiumProps extends ViewProps {
    detailed?: boolean;

    firstPlace?: Player;
    secondPlace?: Player;
    thirdPlace?: Player;

    onPlayerPress?: (id: string) => void;
    onPlayerLongPress?: (id: string) => void;
    rankingAlgorithm: RankingAlgorithm;
}
export default function Podium({
    detailed = true,
    firstPlace,
    secondPlace,
    thirdPlace,

    onPlayerPress,
    onPlayerLongPress,
    rankingAlgorithm,
    ...rest
}: PodiumProps) {
    const firstPlaceAverage = firstPlace
        ? firstPlace.points / firstPlace.matches
        : undefined;
    const secondPlaceAverage = secondPlace
        ? secondPlace.points / secondPlace.matches
        : undefined;
    const thirdPlaceAverage = thirdPlace
        ? thirdPlace.points / thirdPlace.matches
        : undefined;

    const theme = useTheme();

    return (
        <ThemedView
            {...rest}
            style={[
                {
                    flexDirection: 'row',

                    marginTop: 24,
                },
                rest.style,
            ]}
        >
            <TouchableOpacity
                disabled={secondPlace == null || !onPlayerPress}
                activeOpacity={0.6}
                style={{
                    alignItems: 'center',
                    marginTop: 48,
                    flex: 1,

                    opacity: secondPlace ? 1 : 0.2,
                }}
                onPress={() => secondPlace && onPlayerPress?.(secondPlace?.id)}
                onLongPress={() =>
                    secondPlace && onPlayerLongPress?.(secondPlace?.id)
                }
            >
                <ThemedText
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    {formatPlacement(2)}
                </ThemedText>
                <Avatar
                    url={secondPlace?.avatarUrl}
                    name={secondPlace?.name}
                    size={96}
                />
                <Description
                    detailed={detailed}
                    player={secondPlace}
                    average={
                        rankingAlgorithm === 'AVERAGE'
                            ? formatAverage(secondPlaceAverage)
                            : rankingAlgorithm === 'ELO'
                              ? formatElo(secondPlace?.elo)
                              : formatWinRate(
                                    secondPlace?.matches,
                                    secondPlace?.matchesWon
                                )
                    }
                />
            </TouchableOpacity>
            <TouchableOpacity
                disabled={firstPlace == null || !onPlayerPress}
                activeOpacity={0.6}
                onPress={() => firstPlace && onPlayerPress?.(firstPlace?.id)}
                onLongPress={() =>
                    firstPlace && onPlayerLongPress?.(firstPlace?.id)
                }
                style={{
                    alignItems: 'center',

                    // 24px overlap with the 2nd and 3rd place
                    width: 128 - 24 - 24,

                    // to make the shadow work
                    zIndex: 1,

                    shadowOffset: {
                        width: 0,
                        height: 4,
                    },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    flex: 1,

                    opacity: firstPlace ? 1 : 0.2,
                }}
            >
                <ThemedText
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    {formatPlacement(1)}
                </ThemedText>
                <Avatar
                    url={firstPlace?.avatarUrl}
                    name={firstPlace?.name}
                    size={128}
                />
                <Description
                    detailed={detailed}
                    player={firstPlace}
                    average={
                        rankingAlgorithm === 'AVERAGE'
                            ? formatAverage(firstPlaceAverage)
                            : rankingAlgorithm === 'ELO'
                              ? formatElo(firstPlace?.elo)
                              : formatWinRate(
                                    firstPlace?.matches,
                                    firstPlace?.matchesWon
                                )
                    }
                />
            </TouchableOpacity>
            <TouchableOpacity
                disabled={thirdPlace == null || !onPlayerPress}
                activeOpacity={0.6}
                style={{
                    alignItems: 'center',
                    marginTop: 48,
                    flex: 1,
                    opacity: thirdPlace ? 1 : 0.2,
                }}
                onPress={() => thirdPlace && onPlayerPress?.(thirdPlace?.id)}
                onLongPress={() =>
                    thirdPlace && onPlayerLongPress?.(thirdPlace?.id)
                }
            >
                <ThemedText
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    {formatPlacement(3)}
                </ThemedText>
                <Avatar
                    url={thirdPlace?.avatarUrl}
                    name={thirdPlace?.name}
                    size={96}
                />
                <Description
                    detailed={detailed}
                    player={thirdPlace}
                    average={
                        rankingAlgorithm === 'AVERAGE'
                            ? formatAverage(thirdPlaceAverage)
                            : rankingAlgorithm === 'ELO'
                              ? formatElo(thirdPlace?.elo)
                              : formatWinRate(
                                    thirdPlace?.matches,
                                    thirdPlace?.matchesWon
                                )
                    }
                />
            </TouchableOpacity>
        </ThemedView>
    );
}
