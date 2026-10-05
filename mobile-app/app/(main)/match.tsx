import dayjs from 'dayjs';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useEffectEvent, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { useAssetQuery } from '@/api/calls/assetHooks';
import {
    uploadTeamPhoto,
    useDeleteMatchMutation,
    useDeleteMatchPhotoMutation,
    useMatchesQuery,
    useUpdateMatchMutation,
} from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { DualTeamPhoto } from '@/components/DualTeamPhoto';
import ErrorScreen from '@/components/ErrorScreen';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import LoadingScreen from '@/components/LoadingScreen';
import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { RefreshControl } from '@/components/RefreshControl';
import Text from '@/components/Text';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { AppBackground } from '@/lib/Background';
import { getDisplayMatch } from '@/lib/getDisplayMatch';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useInsets } from '@/lib/useInsets';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import {
    draftPlayers,
    useMatchEditDraftStore,
} from '@/zustand/matchEditDraftStore';

/**
 * currently, we need to fetch every single match of the season here, in order to calculate the influence of the viewed match on the
 * ranking of the players. in the future, we might want to move away from this for performance reasons.
 *
 * TODO: find a way to not have to fetch all matches of the season here
 */
export default function Page() {
    const [isEditing, setIsEditing] = useState(false);

    const { groupId, seasonId: activeSeasonId, activeSeason } = useGroup();

    const { id, seasonId } = useLocalSearchParams<{
        id: string;
        seasonId: string;
    }>();

    const isCurrentSeason = activeSeasonId === seasonId;

    const playersQuery = usePlayersQuery(groupId, seasonId);

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

    const matchWithoutPhotos = matches.find((i) => i.id === id);

    const bluePhotoQuery = useAssetQuery(
        matchWithoutPhotos?.blueTeamPhotoAssetId
    );
    const redPhotoQuery = useAssetQuery(
        matchWithoutPhotos?.redTeamPhotoAssetId
    );

    const match = matchWithoutPhotos && {
        ...matchWithoutPhotos,
        blueTeamPhotoUrl: bluePhotoQuery.data?.data?.url ?? null,
        redTeamPhotoUrl: redPhotoQuery.data?.data?.url ?? null,
    };

    const loadMatchIntoDraft = useEffectEvent(() => {
        if (match) {
            matchDraft.actions.setMatch(match);
        }
    });
    useEffect(() => {
        loadMatchIntoDraft();
    }, [isEditing]);

    const displayMatch = isEditing
        ? getDisplayMatch(
              draftPlayers(matchDraft),
              activeSeason?.seasonSettings?.rankingAlgorithm,
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
            showErrorToast('Failed to delete match.', err);
        }
    }

    const { invalidateMatches } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidateMatches(groupId!, seasonId!)
    );
    const navStyles = useNavStyles();

    const updateMatchMutation = useUpdateMatchMutation();

    const deleteMatchPhotoMutation = useDeleteMatchPhotoMutation();

    const [updateMatch, isSaving] = useSingleFlight(async () => {
        if (!groupId || !seasonId || !match?.id || !displayMatch) {
            ConsoleLogger.error(
                'Failed to update match: Group ID or Season ID is missing'
            );
            return;
        }

        const { blueTeamPhotoUri, redTeamPhotoUri } = matchDraft;

        const photosChanged =
            (blueTeamPhotoUri ?? null) !== match.blueTeamPhotoUrl ||
            (redTeamPhotoUri ?? null) !== match.redTeamPhotoUrl;

        const savePhoto =
            photosChanged && !!blueTeamPhotoUri && !!redTeamPhotoUri;

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
                    savePhoto,
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
                    savePhoto,
                },
            ],
            groupId,
            seasonId,
        };
        try {
            if (photosChanged && !savePhoto) {
                // updating a match re-creates its teams (and keeps their photos), so the photos are removed beforehand
                const teams = [
                    {
                        id: match.blueTeamId,
                        hasPhoto: !!match.blueTeamPhotoUrl,
                    },
                    { id: match.redTeamId, hasPhoto: !!match.redTeamPhotoUrl },
                ];
                for (const team of teams.filter((i) => i.hasPhoto)) {
                    await deleteMatchPhotoMutation.mutateAsync({
                        groupId,
                        seasonId,
                        matchId: match.id,
                        teamId: team.id,
                    });
                }
            }

            const res = await updateMatchMutation.mutateAsync(data);

            if (savePhoto && blueTeamPhotoUri && redTeamPhotoUri) {
                // the upload urls reference the teams by their id before the update
                const photoUploads = res.data?.photoUploads ?? [];

                await uploadTeamPhoto(
                    photoUploads.find((i) => i.teamId === match.blueTeamId),
                    blueTeamPhotoUri
                );
                await uploadTeamPhoto(
                    photoUploads.find((i) => i.teamId === match.redTeamId),
                    redTeamPhotoUri
                );
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
            showErrorToast('Failed to update match.', err);
        }
    });

    const isLoading =
        !groupId ||
        !seasonId ||
        matchesQuery.isLoading ||
        playersQuery.isLoading ||
        movesQuery.isLoading ||
        bluePhotoQuery.isLoading ||
        redPhotoQuery.isLoading;

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

    async function onEditCancel() {
        if (matchDraft.isDirty) {
            // TODO: show confirmation dialog
        }
        setIsEditing(false);
    }

    const editFinisher = displayMatch.blueTeam
        .concat(displayMatch.redTeam)
        .find((i) => i.moves.some((j) => j.isFinish && j.count > 0));
    const editFinishMove = editFinisher?.moves.find(
        (j) => j.isFinish && j.count > 0
    );

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    title: '',
                    headerBackButtonDisplayMode: 'minimal',
                    headerTitle: () => (
                        <MatchVsHeader variant="header" match={match} />
                    ),
                }}
            />
            {/* While editing, Cancel replaces the native back button. */}
            {isEditing && (
                <Stack.Toolbar placement="left">
                    <Stack.Toolbar.Button onPress={onEditCancel}>
                        Cancel
                    </Stack.Toolbar.Button>
                </Stack.Toolbar>
            )}
            {isCurrentSeason && (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button
                        variant={isEditing ? 'done' : 'plain'}
                        disabled={
                            (isEditing && !matchDraft.isDirty) ||
                            isSaving ||
                            deleteMatchMutation.isPending
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
                    </Stack.Toolbar.Button>
                </Stack.Toolbar>
            )}
            <AppBackground />
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: insets.top + 16,
                    paddingBottom: 32,
                }}
                refreshControl={<RefreshControl {...refresh} />}
            >
                {match && (
                    <Text
                        color="secondary"
                        style={{ textAlign: 'center', marginBottom: 24 }}
                    >
                        {env.format.date.matchesSeperatorDay(dayjs(match.date))}{' '}
                        at {env.format.date.matchHour(dayjs(match.date))}
                    </Text>
                )}
                {(isEditing ||
                    (match?.blueTeamPhotoUrl && match?.redTeamPhotoUrl)) && (
                    <DualTeamPhoto
                        match={displayMatch}
                        editable={isEditing}
                        onPhotoTaken={matchDraft.actions.setTeamPhotos}
                        onRemovePress={() =>
                            Alert.alert(
                                'Delete Match Photo',
                                "Are you sure you want to delete this match photo? This can't be undone.",
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress:
                                            matchDraft.actions.removeTeamPhotos,
                                    },
                                ]
                            )
                        }
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
                {isEditing && (
                    <MenuSection style={{ marginTop: 12, marginBottom: 20 }}>
                        <MenuItem
                            border={false}
                            title="Finish"
                            headIcon="crown-outline"
                            tailContent={
                                editFinisher && editFinishMove
                                    ? `${editFinisher.name} · ${editFinishMove.title}`
                                    : 'Not set'
                            }
                            tailIconType="next"
                            // the sheet's pages after the players pick who finished, then how
                            onPress={() =>
                                nav.navigate('editMatchPoints', {
                                    pageIdx:
                                        displayMatch.blueTeam.length +
                                        displayMatch.redTeam.length,
                                })
                            }
                        />
                    </MenuSection>
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
                    <View style={{ height: insets.bottom + 4 }} />
                </View>
            )}
        </>
    );
}
