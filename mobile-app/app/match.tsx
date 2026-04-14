import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
    useDeleteMatchMutation,
    useDeleteMatchPhotoMutation,
    useMatchesQuery,
    useMatchQuery,
    useUpdateMatchMutation,
    useUpdateMatchPhotoMutation,
} from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { uriToByteArray } from '@/api/utils/uriToByteArray';
import { AppBackground } from '@/app/Background';
import { getDisplayMatch } from '@/app/getDisplayMatch';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import ConfirmationModal from '@/components/ConfirmationModal';
import { DualTeamPhoto } from '@/components/DualTeamPhoto';
import ErrorScreen from '@/components/ErrorScreen';
import { HeaderItem } from '@/components/HeaderItem';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import LoadingScreen from '@/components/LoadingScreen';
import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { PlayerAndMatchBottomNav } from '@/components/PlayerAndMatchBottomNav';
import { RefreshControl } from '@/components/RefreshControl';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchEditDraftStore } from '@/zustand/matchEditDraftStore';

/**
 * currently, we need to fetch every single match of the season here, in order to calculate the influence of the viewed match on the
 * ranking of the players. in the future, we might want to move away from this for performance reasons.
 *
 * TODO: find a way to not have to fetch all matches of the season here
 */
const USE_MATCH_QUERY = false;

export default function Page() {
    const [isEditing, setIsEditing] = useState(false);

    const { groupId, group } = useGroup();

    const { id, seasonId } = useLocalSearchParams<{
        id: string;
        seasonId: string;
    }>();

    const isCurrentSeason = group.data?.activeSeason?.id === seasonId;

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const profiles = playersQuery.data?.data ?? [];

    const matchQuery = useMatchQuery(groupId, seasonId, id);

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const matchesQuery = useMatchesQuery(groupId, seasonId);

    const matchDraft = useMatchEditDraftStore();

    const matches =
        matchesQuery.data?.data?.map(
            matchDtoToMatch(playersQuery.data?.data, allowedMoves)
        ) ?? [];

    const deleteMatchMutation = useDeleteMatchMutation();

    const nav = useNavigation();

    const insets = useInsets(true, true);

    const match = USE_MATCH_QUERY
        ? matchQuery.data?.data
            ? matchDtoToMatch(profiles, allowedMoves)(matchQuery.data.data)
            : null
        : matches.find((i) => i.id === id);

    useEffect(() => {
        if (match) {
            matchDraft.actions.setMatch(match);
        }
    }, [isEditing]);

    const prevMatchId = undefined; // TODO
    const nextMatchId = undefined; // TODO

    const displayMatch = isEditing
        ? getDisplayMatch(
              matchDraft.actions.getPlayers(),
              group.data?.activeSeason?.seasonSettings?.rankingAlgorithm,
              playersQuery.data?.data ?? [],
              matches,
              movesQuery.data?.data ?? []
          )
        : match;

    async function onDelete() {
        if (!groupId || !seasonId || !id) return;

        try {
            await deleteMatchMutation.mutateAsync({
                groupId,
                seasonId,
                id,
            });
            showSuccessToast('Match deleted.');
            nav.goBack();
        } catch (err) {
            ConsoleLogger.error('failed to delete match:', err);
            showErrorToast('Failed to delete match.');
        }
    }

    const { invalidateMatches } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidateMatches(groupId!, seasonId!)
    );
    const navStyles = useNavStyles();

    const updateMatchMutation = useUpdateMatchMutation();

    const updateMatchPhotoMutation = useUpdateMatchPhotoMutation();

    const deleteMatchPhotoMutation = useDeleteMatchPhotoMutation();

    const [isSaving, setIsSaving] = useState(false);

    async function updateMatch() {
        if (!groupId || !seasonId || !match?.id || !displayMatch) {
            ConsoleLogger.error(
                'Failed to update match: Group ID or Season ID is missing'
            );
            return;
        }

        const data = {
            id: match.id,
            teams: [
                {
                    teamMembers: displayMatch.blueTeam.map((i) => ({
                        playerId: i.id,
                        moves: i.moves.map((j) => ({
                            moveId: j.id,
                            count: j.count,
                        })),
                    })),
                    existingTeamId: match.blueTeamId,
                },
                {
                    teamMembers: displayMatch.redTeam.map((i) => ({
                        playerId: i.id,
                        moves: i.moves.map((j) => ({
                            moveId: j.id,
                            count: j.count,
                        })),
                    })),
                    existingTeamId: match.redTeamId,
                },
            ],
            groupId,
            seasonId,
        };
        setIsSaving(true);

        try {
            const res = await updateMatchMutation.mutateAsync(data);

            const newBlueTeamId = res.data!.teams![0].id!;
            const newRedTeamId = res.data!.teams![1].id!;

            if (
                matchDraft.blueTeamPhotoUri !== match.blueTeamPhotoUrl ||
                matchDraft.redTeamPhotoUri !== match.redTeamPhotoUrl
            ) {
                if (
                    !matchDraft.blueTeamPhotoUri ||
                    !matchDraft.redTeamPhotoUri
                ) {
                    await deleteMatchPhotoMutation.mutateAsync({
                        groupId,
                        seasonId,
                        matchId: match.id,
                        teamId: newBlueTeamId,
                    });
                    await deleteMatchPhotoMutation.mutateAsync({
                        groupId,
                        seasonId,
                        matchId: match.id,
                        teamId: newRedTeamId,
                    });
                } else {
                    const blueByteArray = await uriToByteArray(
                        matchDraft.blueTeamPhotoUri
                    );
                    const redByteArray = await uriToByteArray(
                        matchDraft.redTeamPhotoUri
                    );

                    await updateMatchPhotoMutation.mutateAsync({
                        groupId,
                        seasonId,
                        matchId: match.id,
                        mimeType: 'image/png',
                        byteArray: blueByteArray,
                        teamId: newBlueTeamId,
                    });

                    await updateMatchPhotoMutation.mutateAsync({
                        groupId,
                        seasonId,
                        matchId: match.id,
                        mimeType: 'image/png',
                        byteArray: redByteArray,
                        teamId: newRedTeamId,
                    });
                }
            }
            showSuccessToast('Updated match.');
            setIsEditing(false);
            invalidateMatches(groupId, seasonId);
        } catch (err) {
            ConsoleLogger.error(
                'failed to update match:',
                err,
                JSON.stringify(data, null, 2)
            );
            showErrorToast('Failed to update match.');
        } finally {
            setIsSaving(false);
        }
    }

    const [showDeletePhotoPrompt, setShowDeletePhotoPrompt] = useState(false);

    const isLoading =
        !groupId ||
        !seasonId ||
        matchesQuery.isLoading ||
        playersQuery.isLoading ||
        movesQuery.isLoading ||
        (USE_MATCH_QUERY && matchQuery.isLoading);

    if (isLoading) return <LoadingScreen />;

    if (!displayMatch) {
        if (isEditing) return <ErrorScreen message="Failed to edit match" />;
        return (
            <ErrorScreen
                message={
                    matchesQuery.error?.message ||
                    playersQuery.error?.message ||
                    movesQuery.error?.message ||
                    'Failed to load match'
                }
            />
        );
    }
    const teamMembers = displayMatch.blueTeam.concat(displayMatch.redTeam);

    const headerItemWidth = 54;

    async function onEditCancel() {
        if (matchDraft.isDirty) {
            // TODO: show confirmation dialog
        }
        setIsEditing(false);
    }

    return (
        <>
            <ConfirmationModal
                isVisible={showDeletePhotoPrompt}
                onClose={() => setShowDeletePhotoPrompt(false)}
                title="Delete Match Photo"
                description="Are you sure you want to delete this match photo? This can't be undone."
                actions={[
                    {
                        type: 'danger',
                        title: 'Delete',
                        onPress: () => {
                            matchDraft.actions.removeTeamPhotos();
                            setShowDeletePhotoPrompt(false);
                        },
                    },
                    {
                        title: 'Cancel',
                        onPress: () => setShowDeletePhotoPrompt(false),
                    },
                ]}
            />

            <Stack.Screen
                options={{
                    ...navStyles,
                    title: '',

                    headerLeft: isEditing
                        ? () => (
                              <HeaderItem
                                  left
                                  width={headerItemWidth}
                                  noMargin
                                  onPress={onEditCancel}
                              >
                                  Cancel
                              </HeaderItem>
                          )
                        : () => (
                              <HeaderItem
                                  left
                                  width={headerItemWidth}
                                  noMargin
                                  onPress={() => nav.goBack()}
                                  backButton
                              />
                          ),
                    headerBackButtonDisplayMode: 'minimal',
                    headerRight: () =>
                        isCurrentSeason ? (
                            <HeaderItem
                                right
                                width={headerItemWidth}
                                noMargin
                                disabled={isEditing && !matchDraft.isDirty}
                                isLoading={
                                    isSaving || deleteMatchMutation.isPending
                                }
                                onPress={async () => {
                                    if (!isEditing) {
                                        setIsEditing(true);
                                        return;
                                    }
                                    if (matchDraft.isDirty) {
                                        await updateMatch();
                                    }
                                }}
                            >
                                {isEditing ? 'Save' : 'Edit'}
                            </HeaderItem>
                        ) : undefined,
                    headerTitle: () => (
                        <MatchVsHeader variant="header" match={match} />
                    ),
                }}
            />
            <AppBackground />
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: insets.top + 32,
                    paddingBottom: 32,
                }}
                refreshControl={<RefreshControl {...refresh} />}
            >
                {(isEditing ||
                    (match?.blueTeamPhotoUrl && match?.redTeamPhotoUrl)) && (
                    <DualTeamPhoto
                        match={displayMatch}
                        editable={isEditing}
                        onPhotoTaken={matchDraft.actions.setTeamPhotos}
                        onRemovePress={() => setShowDeletePhotoPrompt(true)}
                        onSwapTeamColorsPress={
                            matchDraft.actions.swapTeamPhotos
                        }
                        blueImageSource={
                            isEditing
                                ? matchDraft?.blueTeamPhotoUri
                                    ? { uri: matchDraft?.blueTeamPhotoUri }
                                    : undefined
                                : match?.blueTeamPhotoUrl
                                  ? { uri: match?.blueTeamPhotoUrl }
                                  : undefined
                        }
                        redImageSource={
                            isEditing
                                ? matchDraft?.redTeamPhotoUri
                                    ? { uri: matchDraft?.redTeamPhotoUri }
                                    : undefined
                                : match?.redTeamPhotoUrl
                                  ? { uri: match?.redTeamPhotoUrl }
                                  : undefined
                        }
                    />
                )}
                <MatchPlayers
                    onPlayerPress={(player) => {
                        if (isEditing) {
                            const pageIdx = displayMatch.blueTeam
                                .concat(displayMatch.redTeam)
                                .findIndex((j) => j.id === player.id);

                            nav.navigate('editMatchPoints', {
                                pageIdx,
                            });
                        } else {
                            nav.navigate('player', {
                                id: player.id!,
                            });
                        }
                    }}
                    editable={isEditing}
                    players={teamMembers}
                    setMoveCount={() => {}} // TODO: remove unused prop
                />
                {isEditing && (
                    <MenuSection
                        style={{
                            width: '100%',

                            marginTop: 24,
                        }}
                    >
                        <MenuItem
                            title="Delete Match"
                            headIcon="delete-outline"
                            onPress={onDelete}
                            type="danger"
                            confirmationPrompt={{
                                title: 'Delete Match',
                                description:
                                    'Are you sure you want to delete this match?',
                            }}
                        />
                    </MenuSection>
                )}
            </ScrollView>
            {!isEditing && !isCurrentSeason && (
                <View
                    style={{
                        position: 'absolute',

                        left: 0,
                        right: 0,
                        bottom: 0,
                    }}
                >
                    <LeaderboardScopePicker
                        onlyShowSeason={seasonId}
                        isPastSeason
                        hasPastSeasonsButton={false}
                        hasSortButton={false}
                    />
                    <PlayerAndMatchBottomNav
                        hasNextAndPrevButtons={false}
                        onPrevPress={
                            !prevMatchId
                                ? undefined
                                : () => {
                                      if (prevMatchId) {
                                          nav.navigate('match', {
                                              id: prevMatchId,
                                              seasonId,
                                          });
                                      }
                                  }
                        }
                        onNextPress={
                            !nextMatchId
                                ? undefined
                                : () => {
                                      if (nextMatchId) {
                                          nav.navigate('match', {
                                              id: nextMatchId,
                                              seasonId,
                                          });
                                      }
                                  }
                        }
                    />
                </View>
            )}
        </>
    );
}
