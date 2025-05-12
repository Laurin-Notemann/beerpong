import { Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
} from 'react-native-reanimated';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import Swiper from 'react-native-swiper';

import {
    useCreateMatchMutation,
    useMatchesQuery,
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
import { HeaderItem } from '@/components/HeaderItem';
import MatchVsHeader from '@/components/MatchVsHeader';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import NewMatchAssignTeams, {
    Player,
} from '@/components/screens/NewMatchAssignTeams';
import { triggerHapticBump } from '@/haptics';
import { theme } from '@/theme';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

import { navStyles } from '../navigation/navStyles';
import { useNavigation } from '../navigation/useNavigation';

const EXPERIMENTAL_CAROUSEL = true;

const { width } = Dimensions.get('window');

export default function Screen() {
    const scrollX = useSharedValue(0);

    // float between 0 and 1
    const progress = useDerivedValue(
        () => (scrollX.value / width ** 2) * -1,
        [scrollX]
    );

    const styleOut = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(progress.value, [0, 1], [0, -96]),
            },
        ],
        opacity: interpolate(progress.value, [0, 1], [1, 0]),
    }));

    const styleIn = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(progress.value, [0, 1], [96, 0]),
            },
        ],
        opacity: interpolate(progress.value, [0, 1], [0, 1]),
    }));

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

    const matchesQuery = useMatchesQuery(groupId, seasonId);

    const matches =
        matchesQuery.data?.data?.map(
            matchDtoToMatch(playersQuery.data?.data, allowedMoves)
        ) ?? [];

    const swiperRef = useRef<Swiper>(null);
    const carouselRef = useRef<ICarouselInstance>(null);

    const [swiperPage, setSwiperPage] = useState(0);

    const players = matchDraft.actions.getPlayers();

    const teamMembers = players.map<TeamMember>((i) => {
        const profile = (playersQuery.data?.data ?? []).find(
            (j) => i.playerId === j.id
        );

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
        const points = pointsForOwnMoves + pointsForTeamMoves;

        return {
            id: i.playerId,
            team: i.team,
            avatarUrl: profile?.profile?.avatarAsset?.url,
            name: profile?.profile?.name || 'Unknown',
            points,
            change: 0, // we set this later, can't set it here bc we need matchObj to calculate it which requires teamMembers 🙃
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
            carouselRef.current?.prev();
        } catch (err) {
            ConsoleLogger.error('failed to create match:', err);
            showErrorToast('Failed to create match.');
        }
    }

    const { experimentalImprovedMatchCreation } = useLocalSettings();

    const matchObj = {
        id: '#',
        date: new Date(),
        blueCups: teamMembers
            .filter((i) => i.team === 'blue')
            .map((i) => i.moves)
            .flat()
            .reduce((sum, i) => sum + i.count, 0),
        redCups: teamMembers
            .filter((i) => i.team === 'red')
            .map((i) => i.moves)
            .flat()
            .reduce((sum, i) => sum + i.count, 0),
        redTeam: teamMembers.filter((i) => i.team === 'red'),
        blueTeam: teamMembers.filter((i) => i.team === 'blue'),
        winnerTeamId: null,
    };

    for (const i of teamMembers) {
        i.change = getInfluenceOfMatchOnAveragePoints(
            matches.concat([matchObj as Match]),
            i.id,
            '#'
        );
    }

    return (
        <GestureHandlerRootView>
            {experimentalImprovedMatchCreation ? (
                <>
                    <Stack.Screen
                        options={{
                            ...navStyles,
                            headerLeft: () => (
                                <View
                                    style={{
                                        overflow: 'hidden',

                                        width: 96,
                                        height: 22,
                                    }}
                                >
                                    <Animated.View
                                        style={[
                                            {
                                                position: 'absolute',
                                            },
                                            styleOut,
                                        ]}
                                    >
                                        {!bothTeamsEmpty && (
                                            <HeaderItem
                                                onPress={() => {
                                                    matchDraft.actions.clear();
                                                    triggerHapticBump(
                                                        'selection'
                                                    );
                                                }}
                                            >
                                                Clear
                                            </HeaderItem>
                                        )}
                                    </Animated.View>
                                    <Animated.View
                                        style={[
                                            {
                                                position: 'absolute',
                                            },
                                            styleIn,
                                        ]}
                                    >
                                        <HeaderItem
                                            onPress={() => {
                                                swiperRef.current?.scrollBy(-1);
                                                carouselRef.current?.prev();
                                            }}
                                        >
                                            Back
                                        </HeaderItem>
                                    </Animated.View>
                                </View>
                            ),
                            headerRight: () => (
                                <View
                                    style={{
                                        overflow: 'hidden',

                                        flexDirection: 'row-reverse',

                                        width: 96,
                                        height: 22,
                                    }}
                                >
                                    <Animated.View
                                        style={[
                                            {
                                                position: 'absolute',
                                            },
                                            styleOut,
                                        ]}
                                    >
                                        <HeaderItem
                                            onPress={() => {
                                                swiperRef.current?.scrollBy(1);
                                                carouselRef.current?.next();
                                            }}
                                            disabled={!hasValidTeams}
                                        >
                                            Next
                                        </HeaderItem>
                                    </Animated.View>
                                    <Animated.View
                                        style={[
                                            {
                                                position: 'absolute',
                                            },
                                            styleIn,
                                        ]}
                                    >
                                        <HeaderItem
                                            onPress={onCreateMatch}
                                            disabled={
                                                createMatchMutation.isPending
                                            }
                                        >
                                            {createMatchMutation.isPending ? (
                                                <ActivityIndicator />
                                            ) : (
                                                'Create'
                                            )}
                                        </HeaderItem>
                                    </Animated.View>
                                </View>
                            ),
                            headerTitle: bothTeamsEmpty
                                ? 'Assign Teams'
                                : () => (
                                      <MatchVsHeader
                                          match={matchObj}
                                          style={{
                                              bottom: 4,
                                          }}
                                      />
                                  ),
                        }}
                    />
                    {EXPERIMENTAL_CAROUSEL ? (
                        <Carousel
                            ref={carouselRef}
                            style={{
                                backgroundColor: theme.color.bg,
                            }}
                            onProgressChange={(
                                relativeOffset,
                                absoluteProgress
                            ) => {
                                scrollX.value = relativeOffset * width;
                            }}
                            onSnapToItem={(pageIdx) => {
                                if (
                                    pageIdx === 1 &&
                                    !matchDraft.hasBeenOnPageTwo
                                ) {
                                    nav.navigate('assignPointsToPlayerModal', {
                                        pageIdx: 0,
                                    });
                                    matchDraft.actions.setHasBeenOnPageTwo();
                                }
                                setSwiperPage(pageIdx);
                            }}
                            loop={false}
                            width={width}
                            enabled={!(swiperPage === 0 && !hasValidTeams)}
                            data={[null, null]}
                            renderItem={(item) =>
                                item.index === 0 ? (
                                    <NewMatchAssignTeams
                                        players={profiles}
                                        setTeam={
                                            matchDraft.actions.setPlayerTeam
                                        }
                                        onSubmit={oldFlowGoToNextPage}
                                    />
                                ) : (
                                    <CreateMatchAssignPoints
                                        isPending={
                                            createMatchMutation.isPending
                                        }
                                        players={teamMembers}
                                        setMoveCount={
                                            matchDraft.actions.setMoveCount
                                        }
                                        onSubmit={onCreateMatch}
                                        onCancel={() => {
                                            matchDraft.actions.clear();
                                            nav.goBack();
                                        }}
                                        onPlayerPress={(player) =>
                                            nav.navigate(
                                                'assignPointsToPlayerModal',
                                                {
                                                    pageIdx:
                                                        teamMembers.findIndex(
                                                            (i) =>
                                                                i.id ===
                                                                player.id
                                                        ),
                                                }
                                            )
                                        }
                                    />
                                )
                            }
                        />
                    ) : (
                        <Swiper
                            showsPagination={false}
                            loop={false}
                            ref={swiperRef}
                            index={swiperPage}
                            onIndexChanged={onIndexChanged}
                            scrollEnabled={
                                !(swiperPage === 0 && !hasValidTeams)
                            }
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
                    )}
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
