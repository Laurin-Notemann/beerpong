import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import {
    useDeleteMatchMutation,
    useMatchesQuery,
    useMatchQuery,
    useUpdateMatchMutation,
} from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import {
    getInfluenceOfMatchOnAveragePoints,
    Match,
    matchDtoToMatch,
    TeamMember,
} from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import { HeaderItem } from '@/components/HeaderItem';
import LoadingScreen from '@/components/LoadingScreen';
import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { RefreshControl } from '@/components/RefreshControl';
import { useTheme } from '@/theme';
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
    const theme = useTheme();

    const [isEditing, setIsEditing] = useState(false);

    const { groupId, seasonId, group } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const profiles = playersQuery.data?.data ?? [];

    const { id } = useLocalSearchParams<{ id: string }>();

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

    const insets = useInsets();

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

    const players = matchDraft.actions.getPlayers();

    const teamMembers = players.map<TeamMember>((i) => {
        const profile = profiles.find((j) => i.playerId === j.id);

        if (!profile?.profile?.name) {
            ConsoleLogger.error('failed to get profile for team member');
        }

        const ownTeam = players.filter((j) => j.team === i.team);

        const pointsForOwnMoves = i.moves.reduce(
            (sum, j) =>
                sum +
                j.count *
                    (allowedMoves.find((k) => k.id === j.moveId)
                        ?.pointsForScorer ?? 0),
            0
        );
        const teamMoves = ownTeam.reduce<(typeof i)['moves']>(
            (sum, j) => sum.concat(j.moves),
            []
        );
        const pointsForTeamMoves = teamMoves.reduce((sum, j) => {
            const pointsForMove =
                allowedMoves.find((k) => k.id === j.moveId)?.pointsForTeam ?? 0;

            return sum + pointsForMove * j.count;
        }, 0);
        const pointsThisMatch = pointsForOwnMoves + pointsForTeamMoves;

        return {
            id: i.playerId,
            team: i.team,
            avatarUrl: profile?.profile?.avatarAsset?.url,
            name: profile?.profile?.name || 'Unknown',
            points: pointsThisMatch,
            change: 0, // unused in this occurence so we don't have to calculate it here
            moves: allowedMoves.map((j) => {
                return {
                    id: j.id!,
                    count: i.moves.find((k) => k.moveId === j.id)?.count ?? 0,
                    title: j.name || 'Unknown',
                    points: j.pointsForScorer!,
                    pointsForTeam: j.pointsForTeam!,
                    isFinish: j.finishingMove!,
                };
            }),
        };
    });

    const matchObj: Omit<Match, 'winnerTeamId'> | null = isEditing
        ? {
              id: match?.id!,
              date: match?.date!,
              blueCups: players
                  .filter((i) => i.team === 'blue')
                  .map((i) => i.moves)
                  .flat()
                  .reduce((sum, i) => sum + i.count, 0),
              redCups: players
                  .filter((i) => i.team === 'red')
                  .map((i) => i.moves)
                  .flat()
                  .reduce((sum, i) => sum + i.count, 0),
              redTeam: teamMembers.filter((i) => i.team === 'red'),
              blueTeam: teamMembers.filter((i) => i.team === 'blue'),
          }
        : match!;

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

    function setMoveCount(userId: string, moveId: string, count: number) {
        // setPlayers((prev) => {
        //     const copy: typeof prev = JSON.parse(JSON.stringify(prev));
        //     const player = copy.find((i) => i.id === userId);
        //     if (!player) return prev;
        //     const move = player?.moves.find((i) => i.id === moveId);
        //     if (!move) return prev;
        //     move.count = count;
        //     return copy;
        // });
    }

    const { invalidateMatches } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidateMatches(groupId!, seasonId!)
    );
    const navStyles = useNavStyles();

    const updateMatchMutation = useUpdateMatchMutation();

    async function updateMatch() {
        if (!groupId || !seasonId || !match?.id) {
            ConsoleLogger.error(
                'Failed to update match: Group ID or Season ID is missing'
            );
            return;
        }

        const data = {
            id: match.id,
            teams: [
                {
                    teamMembers: matchObj!.blueTeam.map((i) => ({
                        playerId: i.id,
                        moves: i.moves.map((j) => ({
                            moveId: j.id,
                            count: j.count,
                        })),
                    })),
                },
                {
                    teamMembers: matchObj!.redTeam.map((i) => ({
                        playerId: i.id,
                        moves: i.moves.map((j) => ({
                            moveId: j.id,
                            count: j.count,
                        })),
                    })),
                },
            ],
            groupId,
            seasonId,
        };

        try {
            await updateMatchMutation.mutateAsync(data);
            showSuccessToast('Updated match.');
            setIsEditing(false);
        } catch (err) {
            ConsoleLogger.error(
                'failed to update match:',
                err,
                JSON.stringify(data, null, 2)
            );
            showErrorToast('Failed to update match.');
        }
    }

    const isLoading =
        !groupId ||
        !seasonId ||
        matchesQuery.isLoading ||
        playersQuery.isLoading ||
        movesQuery.isLoading ||
        (USE_MATCH_QUERY && matchQuery.isLoading);

    if (isLoading) return <LoadingScreen />;

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerBackTitleVisible: false,
                    headerRight: () => (
                        <HeaderItem
                            disabled={isEditing && !matchDraft.isDirty}
                            isLoading={
                                updateMatchMutation.isPending ||
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
                        </HeaderItem>
                    ),
                    headerLeft: isEditing
                        ? () => (
                              <HeaderItem
                                  onPress={async () => {
                                      if (matchDraft.isDirty) {
                                          // TODO: show confirmation dialog
                                      }
                                      setIsEditing(false);
                                  }}
                              >
                                  Cancel
                              </HeaderItem>
                          )
                        : undefined,
                    headerTitle: () =>
                        match ? (
                            <MatchVsHeader
                                match={match}
                                style={{
                                    bottom: 4,
                                }}
                            />
                        ) : (
                            ''
                        ),
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: insets.top + 32,
                    paddingBottom: 32,
                }}
                refreshControl={<RefreshControl {...refresh} />}
            >
                <MatchPlayers
                    onPlayerPress={(player) => {
                        if (isEditing) {
                            const pageIdx = (matchObj?.blueTeam ?? [])
                                .concat(matchObj?.redTeam ?? [])
                                .findIndex((j) => j.id === player.id);

                            nav.navigate('editMatchPoints', {
                                pageIdx,
                            });
                        } else {
                            nav.navigate('player', player);
                        }
                    }}
                    editable={isEditing}
                    players={(matchObj?.blueTeam ?? [])
                        .concat(matchObj?.redTeam ?? [])
                        .map((i) => ({
                            id: i.id!,
                            change: getInfluenceOfMatchOnAveragePoints(
                                isEditing
                                    ? matches.map((i) =>
                                          i.id === match?.id ? matchObj! : i
                                      )
                                    : matches,
                                i.id!,
                                match?.id!,
                                group.data?.activeSeason?.seasonSettings
                                    ?.rankingAlgorithm
                            ),
                            moves: i.moves,
                            name: i.name,
                            avatarUrl: i.avatarUrl,
                            points: i.points,
                            team: i.team,
                        }))}
                    setMoveCount={setMoveCount}
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
        </>
    );
}
