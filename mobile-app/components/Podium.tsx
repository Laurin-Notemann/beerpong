import React from 'react';
import { TouchableOpacity, View, ViewProps } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import Avatar from '@/components/Avatar';
import Text from '@/components/Text';
import {
    getRankingAlgorithm,
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
                            color: theme.color.text.primary,
                        }}
                    >
                        {average}
                    </Text>
                    <Text
                        style={{
                            fontSize: 13,
                            color: theme.color.text.secondary,
                            marginTop: 13,
                        }}
                    >
                        {plural(player.points, 'point', 'points')}
                    </Text>

                    <Text
                        style={{
                            fontSize: 13,
                            color: theme.color.text.secondary,
                            marginTop: -8,
                        }}
                    >
                        {plural(player.matches, 'match', 'matches')}
                    </Text>
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
    rankingAlgorithm: RankingAlgorithm;
}
export default function Podium({
    detailed = true,
    firstPlace,
    secondPlace,
    thirdPlace,

    onPlayerPress,
    rankingAlgorithm,
    ...rest
}: PodiumProps) {
    const theme = useTheme();

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
            >
                <Text
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    {formatPlacement(2)}
                </Text>
                <Avatar
                    url={secondPlace?.avatarUrl}
                    name={secondPlace?.name}
                    size={96}
                />
                <Description
                    detailed={detailed}
                    player={secondPlace}
                    average={getRankingAlgorithm(
                        rankingAlgorithm
                    ).getDisplayValue(secondPlace)}
                />
            </TouchableOpacity>
            <TouchableOpacity
                disabled={firstPlace == null || !onPlayerPress}
                activeOpacity={0.6}
                onPress={() => firstPlace && onPlayerPress?.(firstPlace?.id)}
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
                <Text
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    {formatPlacement(1)}
                </Text>
                <Avatar
                    url={firstPlace?.avatarUrl}
                    name={firstPlace?.name}
                    size={128}
                />
                <Description
                    detailed={detailed}
                    player={firstPlace}
                    average={getRankingAlgorithm(
                        rankingAlgorithm
                    ).getDisplayValue(firstPlace)}
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
            >
                <Text
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    {formatPlacement(3)}
                </Text>
                <Avatar
                    url={thirdPlace?.avatarUrl}
                    name={thirdPlace?.name}
                    size={96}
                />
                <Description
                    detailed={detailed}
                    player={thirdPlace}
                    average={getRankingAlgorithm(
                        rankingAlgorithm
                    ).getDisplayValue(thirdPlace)}
                />
            </TouchableOpacity>
        </View>
    );
}
