import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import { Match } from '@/api/utils/matchDtoToMatch';
import { RefreshProps } from '@/api/utils/reactQuery';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import { HeaderItem } from '@/components/HeaderItem';
import MatchesList from '@/components/MatchesList';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { PlayerPageHeadSection } from '@/components/PlayerPageHeadSection';
import { RefreshControl } from '@/components/RefreshControl';
import { theme } from '@/theme';

const SHOW_PAST_SEASONS = false;

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
    onDeleteAvatarPress: () => void;
    refresh: RefreshProps;
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
    onDeleteAvatarPress,
    refresh,
}: PlayerScreenProps) {
    const nav = useNavigation();

    const [editable, setEditable] = useState(false);

    const insets = useInsets(true);

    // account for division by zero
    const averagePointsPerMatch =
        matches.length > 0 ? (points / matches.length).toFixed(1) : '--';

    const isUnranked = matches.length < minMatchesRequiredToBeRanked;

    return (
        <GestureHandlerRootView
            style={{ backgroundColor: theme.color.bg, flex: 1 }}
        >
            <Stack.Screen
                options={{
                    ...navStyles,

                    headerBackTitleVisible: false,
                    title: '',
                    headerTitle: 'Player',
                    headerRight: () => (
                        <HeaderItem
                            isLoading={isPending}
                            onPress={() => setEditable((prev) => !prev)}
                        >
                            {editable ? 'Done' : 'Edit'}
                        </HeaderItem>
                    ),
                }}
            />
            {!editable && (
                <MatchesList
                    contentContainerStyle={{
                        paddingTop: insets.top,
                    }}
                    ListHeaderComponent={
                        <>
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
                            <View
                                style={{
                                    width: '100%',
                                    alignItems: 'stretch',
                                }}
                            >
                                {SHOW_PAST_SEASONS && pastSeasons > 0 && (
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
                        </>
                    }
                    matches={matches}
                    refresh={refresh}
                    forPlayer={{ id }}
                />
            )}
            {editable && (
                <ScrollView
                    style={{
                        flex: 1,

                        backgroundColor: theme.color.bg,
                    }}
                    contentContainerStyle={{
                        top: insets.top,
                        alignItems: 'center',

                        paddingBottom: 32,
                    }}
                    refreshControl={<RefreshControl {...refresh} />}
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
                            <MenuItem
                                title="Remove Profile Picture"
                                headIcon="delete-outline"
                                onPress={onDeleteAvatarPress}
                                type="danger"
                                confirmationPrompt={{
                                    title: 'Remove Profile Picture',
                                    description:
                                        "Are you sure you want to remove this player's profile picture?",
                                }}
                            />
                        </MenuSection>
                    </View>
                </ScrollView>
            )}
        </GestureHandlerRootView>
    );
}
