import React from 'react';
import { TouchableOpacity, ViewProps } from 'react-native';

import { Player } from '@/api/propHooks/leaderboardPropHooks';
import Avatar from '@/components/Avatar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { theme } from '@/theme';
import { formatPlacement } from '@/utils/format';

export interface PodiumProps extends ViewProps {
    detailed?: boolean;

    firstPlace?: Player;
    secondPlace?: Player;
    thirdPlace?: Player;

    onPlayerPress?: (id: string) => void;
}
export default function Podium({
    detailed = true,
    firstPlace,
    secondPlace,
    thirdPlace,

    onPlayerPress,
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
                }}
                onPress={() => secondPlace && onPlayerPress?.(secondPlace?.id)}
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
                {detailed && (
                    <>
                        <ThemedText
                            style={{
                                fontSize: 15,
                                color: theme.color.text.primary,
                                marginTop: 12,

                                textAlign: 'center',
                            }}
                        >
                            {secondPlace?.name}
                        </ThemedText>

                        {secondPlace && (
                            <>
                                <ThemedText
                                    style={{
                                        fontSize: 22,
                                        color: theme.color.text.primary,
                                    }}
                                >
                                    {secondPlaceAveragePointsPerMatch}
                                </ThemedText>
                                <ThemedText
                                    style={{
                                        fontSize: 13,
                                        color: theme.color.text.secondary,
                                        marginTop: 13,
                                    }}
                                >
                                    {secondPlace.points} points
                                </ThemedText>

                                <ThemedText
                                    style={{
                                        fontSize: 13,
                                        color: theme.color.text.secondary,
                                        marginTop: -8,
                                    }}
                                >
                                    {secondPlace.matches} matches
                                </ThemedText>
                            </>
                        )}
                    </>
                )}
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
                {detailed && (
                    <>
                        <ThemedText
                            style={{
                                fontSize: 15,
                                color: theme.color.text.primary,
                                marginTop: 12,

                                textAlign: 'center',
                            }}
                        >
                            {firstPlace?.name}
                        </ThemedText>
                        {firstPlace && (
                            <>
                                <ThemedText
                                    style={{
                                        fontSize: 22,
                                        color: theme.color.text.primary,
                                    }}
                                >
                                    {firstPlaceAveragePointsPerMatch}
                                </ThemedText>
                                <ThemedText
                                    style={{
                                        fontSize: 13,
                                        color: theme.color.text.secondary,
                                        marginTop: 13,
                                    }}
                                >
                                    {firstPlace.points} points
                                </ThemedText>
                                <ThemedText
                                    style={{
                                        fontSize: 13,
                                        color: theme.color.text.secondary,
                                        marginTop: -8,
                                    }}
                                >
                                    {firstPlace.matches} matches
                                </ThemedText>
                            </>
                        )}
                    </>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                disabled={thirdPlace == null || !onPlayerPress}
                activeOpacity={0.6}
                style={{ alignItems: 'center', marginTop: 48, flex: 1 }}
                onPress={() => thirdPlace && onPlayerPress?.(thirdPlace?.id)}
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
                {detailed && (
                    <>
                        <ThemedText
                            style={{
                                fontSize: 15,
                                color: theme.color.text.primary,
                                marginTop: 12,

                                textAlign: 'center',
                            }}
                        >
                            {thirdPlace?.name}
                        </ThemedText>
                        {thirdPlace && (
                            <>
                                <ThemedText
                                    style={{
                                        fontSize: 22,
                                        color: theme.color.text.primary,
                                    }}
                                >
                                    {thirdPlaceAveragePointsPerMatch}
                                </ThemedText>
                                <ThemedText
                                    style={{
                                        fontSize: 13,
                                        color: theme.color.text.secondary,
                                        marginTop: 13,
                                    }}
                                >
                                    {thirdPlace.points} points
                                </ThemedText>
                                <ThemedText
                                    style={{
                                        fontSize: 13,
                                        color: theme.color.text.secondary,
                                        marginTop: -8,
                                    }}
                                >
                                    {thirdPlace.matches} matches
                                </ThemedText>
                            </>
                        )}
                    </>
                )}
            </TouchableOpacity>
        </ThemedView>
    );
}
