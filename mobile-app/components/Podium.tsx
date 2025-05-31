import React from 'react';
import { TouchableOpacity, ViewProps } from 'react-native';

import { Player } from '@/api/propHooks/leaderboardPropHooks';
import Avatar from '@/components/Avatar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/theme';
import { formatPlacement } from '@/utils/format';

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
}
export default function Podium({
    detailed = true,
    firstPlace,
    secondPlace,
    thirdPlace,

    onPlayerPress,
    onPlayerLongPress,
    ...rest
}: PodiumProps) {
    const firstPlaceAveragePointsPerMatch = firstPlace?.matches
        ? (firstPlace?.points / firstPlace?.matches).toFixed(1)
        : '--';

    const secondPlaceAveragePointsPerMatch = secondPlace?.matches
        ? (secondPlace?.points / secondPlace?.matches).toFixed(1)
        : '--';

    const thirdPlaceAveragePointsPerMatch = thirdPlace?.matches
        ? (thirdPlace?.points / thirdPlace?.matches).toFixed(1)
        : '--';

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
                    average={secondPlaceAveragePointsPerMatch}
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
                    average={firstPlaceAveragePointsPerMatch}
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
                    average={thirdPlaceAveragePointsPerMatch}
                />
            </TouchableOpacity>
        </ThemedView>
    );
}
