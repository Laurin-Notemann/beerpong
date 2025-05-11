import { Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swiper from 'react-native-swiper';

import { useCreateMatchMutation } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { HeaderItem } from '@/components/HeaderItem';
import MatchVsHeader from '@/components/MatchVsHeader';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import NewMatchAssignTeams, {
    Player,
} from '@/components/screens/NewMatchAssignTeams';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

import { navStyles } from '../navigation/navStyles';
import { useNavigation } from '../navigation/useNavigation';

export default function Screen() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const matchDraft = useMatchDraftStore();

    const profiles = (playersQuery.data?.data ?? []).map<Player>((i) => ({
        id: i.id!,
        name: i.profile?.name || 'Unknown',
        team:
            matchDraft.actions.getPlayers().find((j) => i.id === j.playerId)
                ?.team ?? null,

        avatarUrl: i.profile?.avatarAsset?.url,
    }));

    async function oldFlowGoToNextPage() {
        nav.navigate('newMatchPoints');
        nav.navigate('assignPointsToPlayerModal', { pageIdx: 0 });
    }

    const bothTeamsEmpty =
        matchDraft.blueTeam.teamMembers.length === 0 &&
        matchDraft.redTeam.teamMembers.length === 0;

    const hasValidTeams =
        matchDraft.redTeam.teamMembers.length &&
        matchDraft.blueTeam.teamMembers.length;

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const swiperRef = useRef<Swiper>(null);

    const [swiperPage, setSwiperPage] = useState(0);

    const players = matchDraft.actions.getPlayers();

    const teamMembers = players.map<TeamMember>((i) => {
        const profile = (playersQuery.data?.data ?? []).find(
            (j) => i.playerId === j.id
        );

        if (!profile?.profile?.name) {
            ConsoleLogger.error('failed to get profile for team member');
        }

        return {
            id: i.playerId,
            team: i.team,
            avatarUrl: profile?.profile?.avatarAsset?.url,
            name: profile?.profile?.name || 'Unknown',
            points: i.moves.reduce(
                (sum, j) =>
                    sum +
                    j.count *
                        (allowedMoves.find((k) => k.id === j.moveId)
                            ?.pointsForScorer ?? 0),
                0
            ),
            change: 0.12,
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

    function onIndexChanged(idx: number) {
        if (idx === 1) {
            nav.navigate('assignPointsToPlayerModal', { pageIdx: 0 });
        }
        setSwiperPage(idx);
    }

    const createMatchMutation = useCreateMatchMutation();

    const finishes = teamMembers
        .flatMap((i) => i.moves)
        .filter((i) => i.isFinish);

    const numFinishes = finishes.reduce((sum, i) => sum + i.count, 0);

    const isValidGame = numFinishes === 1;

    async function onCreateMatch() {
        if (!groupId || !seasonId) return;

        if (!isValidGame) {
            nav.navigate('assignPointsToPlayerModal', {
                pageIdx: teamMembers.length,
            });
            return;
        }

        try {
            await createMatchMutation.mutateAsync({
                groupId,
                seasonId,
                teams: [matchDraft.blueTeam, matchDraft.redTeam],
            });
            matchDraft.actions.clear();
            showSuccessToast('Created match.');
            nav.navigate('index');
            swiperRef.current?.scrollBy(-1);
        } catch (err) {
            ConsoleLogger.error('failed to create match:', err);
            showErrorToast('Failed to create match.');
        }
    }

    const { experimentalImprovedMatchCreation } = useLocalSettings();

    return (
        <GestureHandlerRootView>
            {experimentalImprovedMatchCreation ? (
                <>
                    <Stack.Screen
                        options={{
                            ...navStyles,
                            headerLeft: () =>
                                swiperPage === 0 ? (
                                    <HeaderItem
                                        disabled={bothTeamsEmpty}
                                        onPress={() => {
                                            matchDraft.actions.clear();
                                        }}
                                    >
                                        Cancel
                                    </HeaderItem>
                                ) : (
                                    <HeaderItem
                                        onPress={() => {
                                            swiperRef.current?.scrollBy(-1);
                                        }}
                                    >
                                        Cancel
                                    </HeaderItem>
                                ),
                            headerRight: () =>
                                swiperPage === 0 ? (
                                    <HeaderItem
                                        onPress={() => {
                                            swiperRef.current?.scrollBy(1);
                                        }}
                                        disabled={!hasValidTeams}
                                    >
                                        Next
                                    </HeaderItem>
                                ) : (
                                    <HeaderItem
                                        onPress={onCreateMatch}
                                        disabled={createMatchMutation.isPending}
                                    >
                                        {createMatchMutation.isPending ? (
                                            <ActivityIndicator />
                                        ) : (
                                            'Next'
                                        )}
                                    </HeaderItem>
                                ),
                            headerTitle: bothTeamsEmpty
                                ? 'Assign Teams'
                                : () => (
                                      <MatchVsHeader
                                          match={{
                                              blueCups: teamMembers
                                                  .filter(
                                                      (i) => i.team === 'blue'
                                                  )
                                                  .map((i) => i.moves)
                                                  .flat()
                                                  .reduce(
                                                      (sum, i) => sum + i.count,
                                                      0
                                                  ),
                                              redCups: teamMembers
                                                  .filter(
                                                      (i) => i.team === 'red'
                                                  )
                                                  .map((i) => i.moves)
                                                  .flat()
                                                  .reduce(
                                                      (sum, i) => sum + i.count,
                                                      0
                                                  ),
                                              redTeam: teamMembers.filter(
                                                  (i) => i.team === 'red'
                                              ),
                                              blueTeam: teamMembers.filter(
                                                  (i) => i.team === 'blue'
                                              ),
                                          }}
                                          style={{
                                              bottom: 4,
                                          }}
                                      />
                                  ),
                        }}
                    />
                    <Swiper
                        showsPagination={false}
                        loop={false}
                        ref={swiperRef}
                        index={swiperPage}
                        onIndexChanged={onIndexChanged}
                        scrollEnabled={!(swiperPage === 0 && !hasValidTeams)}
                    >
                        <NewMatchAssignTeams
                            players={profiles}
                            setTeam={matchDraft.actions.setPlayerTeam}
                            onSubmit={oldFlowGoToNextPage}
                        />
                        <CreateMatchAssignPoints
                            isPending={createMatchMutation.isPending}
                            players={teamMembers}
                            setMoveCount={matchDraft.actions.setMoveCount}
                            onSubmit={onCreateMatch}
                            onCancel={() => {
                                matchDraft.actions.clear();
                                nav.goBack();
                            }}
                            onPlayerPress={(player) =>
                                nav.navigate('assignPointsToPlayerModal', {
                                    pageIdx: teamMembers.findIndex(
                                        (i) => i.id === player.id
                                    ),
                                })
                            }
                        />
                    </Swiper>
                </>
            ) : (
                <NewMatchAssignTeams
                    players={profiles}
                    setTeam={matchDraft.actions.setPlayerTeam}
                    onSubmit={oldFlowGoToNextPage}
                />
            )}
        </GestureHandlerRootView>
    );
}
