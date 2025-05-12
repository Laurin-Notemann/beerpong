import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
    GestureHandlerRootView,
    RefreshControl,
    ScrollView,
} from 'react-native-gesture-handler';

import { useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { Match } from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { HeaderItem } from '@/components/HeaderItem';
import MatchesList from '@/components/MatchesList';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

import { PlayerPageHeadSection } from '../PlayerPageHeadSection';

export interface PlayerScreenProps {
    minMatchesRequiredToBeRanked: number;
    isPending: boolean;
    id: string;
    placement: number;

    name: string;
    avatarUrl?: string | null;

    matches: Match[];
    matchesWon: number;
    points: number;
    cups: number;
    elo: number;
    hasPremium?: boolean;

    pastSeasons: number;

    onDelete?: () => void;
    onUploadAvatarPress: () => void;
}
export default function PlayerScreen({
    minMatchesRequiredToBeRanked,
    isPending,
    id,
    placement,
    name,
    avatarUrl,
    matches,
    matchesWon,
    points,
    cups,
    elo,
    pastSeasons,
    hasPremium = false,

    onDelete,
    onUploadAvatarPress,
}: PlayerScreenProps) {
    const nav = useNavigation();

    // account for division by zero
    const averagePointsPerMatch =
        matches.length > 0 ? (points / matches.length).toFixed(1) : '--';

    const [editable, setEditable] = useState(false);

    const { groupId, seasonId } = useGroup();

    const { invalidatePlayers } = useQueryInvalidation();

    const { isRefreshing, onRefresh } = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );

    const isUnranked = matches.length < minMatchesRequiredToBeRanked;

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...navStyles,

                    headerBackTitleVisible: false,
                    title: '',
                    headerTitle: 'Player',
                    headerRight: () => (
                        <HeaderItem
                            disabled={editable && isPending}
                            onPress={() => setEditable((prev) => !prev)}
                        >
                            {editable ? (
                                isPending ? (
                                    <ActivityIndicator />
                                ) : (
                                    'Done'
                                )
                            ) : (
                                'Edit'
                            )}
                        </HeaderItem>
                    ),
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    alignItems: 'center',

                    paddingBottom: 32,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                <PlayerPageHeadSection
                    avatarUrl={avatarUrl}
                    placement={placement}
                    name={name}
                    elo={elo}
                    matchesWon={matchesWon}
                    points={points}
                    cups={cups}
                    isUnranked={isUnranked}
                    editable={editable}
                    averagePointsPerMatch={averagePointsPerMatch}
                    onUploadAvatarPress={onUploadAvatarPress}
                    matches={matches}
                />
                {editable && (
                    <View
                        style={{
                            width: '100%',
                            alignItems: 'stretch',
                            paddingHorizontal: 16,
                        }}
                    >
                        <MenuSection>
                            <MenuItem
                                title={name}
                                headIcon="pencil-outline"
                                onPress={() =>
                                    nav.navigate('editPlayerName', { id })
                                }
                                tailIconType="next"
                            />
                            <MenuItem
                                title="Delete Player"
                                headIcon="delete-outline"
                                onPress={onDelete}
                                type="danger"
                                confirmationPrompt={{
                                    title: 'Delete Player',
                                    description:
                                        'Are you sure you want to delete this player?',
                                }}
                            />
                        </MenuSection>
                    </View>
                )}

                {!editable && (
                    <>
                        <View
                            style={{
                                width: '100%',
                                alignItems: 'stretch',
                                paddingHorizontal: 16,
                            }}
                        >
                            {env.isDev && (
                                <MenuSection>
                                    <MenuItem
                                        title="Past Seasons"
                                        headIcon="pencil-outline"
                                        tailContent={pastSeasons}
                                        tailIconType="next"
                                        onPress={() =>
                                            nav.navigate('pastSeasons')
                                        }
                                    />
                                </MenuSection>
                            )}
                        </View>
                        <MatchesList matches={matches} />
                    </>
                )}
            </ScrollView>
        </GestureHandlerRootView>
    );
}
