import React from 'react';

import { theme } from '@/theme';

import Avatar from './Avatar';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Player } from '@/api/propHooks/leaderboardPropHooks';

export interface PodiumProps {
    detailed?: boolean;

    firstPlace?: Player;
    secondPlace?: Player;
    thirdPlace?: Player;
}
export default function Podium({
    detailed = true,
    firstPlace,
    secondPlace,
    thirdPlace,
}: PodiumProps) {
    return (
        <ThemedView
            style={{
                flexDirection: 'row',

                marginTop: -2,
            }}
        >
            <ThemedView style={{ alignItems: 'center', marginTop: 48 }}>
                <ThemedText
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    2
                </ThemedText>
                <Avatar name={secondPlace?.name} size={96} />
                {detailed && (
                    <>
                        <ThemedText
                            style={{
                                fontSize: 15,
                                color: theme.color.text.primary,
                                marginTop: 12,
                            }}
                        >
                            {secondPlace?.name || '-'}
                        </ThemedText>

                        {secondPlace && (
                            <>
                                <ThemedText
                                    style={{
                                        fontSize: 22,
                                        color: theme.color.text.primary,
                                    }}
                                >
                                    6.7
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
                                    56 matches
                                </ThemedText>
                            </>
                        )}
                    </>
                )}
            </ThemedView>
            <ThemedView
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
                }}
            >
                <ThemedText
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    1
                </ThemedText>
                <Avatar name={firstPlace?.name} size={128} />
                {detailed && (
                    <>
                        <ThemedText
                            style={{
                                fontSize: 15,
                                color: theme.color.text.primary,
                                marginTop: 12,
                            }}
                        >
                            {firstPlace?.name || '-'}
                        </ThemedText>
                        {firstPlace && (
                            <>
                                <ThemedText
                                    style={{
                                        fontSize: 22,
                                        color: theme.color.text.primary,
                                    }}
                                >
                                    7.0
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
                                    14 matches
                                </ThemedText>
                            </>
                        )}
                    </>
                )}
            </ThemedView>
            <ThemedView style={{ alignItems: 'center', marginTop: 48 }}>
                <ThemedText
                    style={{
                        fontSize: 22,
                        color: theme.color.text.secondary,
                        marginBottom: 16,
                    }}
                >
                    3
                </ThemedText>
                <Avatar name={thirdPlace?.name} size={96} />
                {detailed && (
                    <>
                        <ThemedText
                            style={{
                                fontSize: 15,
                                color: theme.color.text.primary,
                                marginTop: 12,
                            }}
                        >
                            {thirdPlace?.name || '-'}
                        </ThemedText>
                        {thirdPlace && (
                            <>
                                <ThemedText
                                    style={{
                                        fontSize: 22,
                                        color: theme.color.text.primary,
                                    }}
                                >
                                    6.6
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
                                    56 matches
                                </ThemedText>
                            </>
                        )}
                    </>
                )}
            </ThemedView>
        </ThemedView>
    );
}
