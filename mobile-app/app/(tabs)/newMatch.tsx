import React, { useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
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
import { AppBackground } from '@/app/Background';
import { useNavigation } from '@/app/navigation/useNavigation';
import Cups from '@/app/startLiveMatch';
import { NewMatchStack } from '@/components/NewMatchStack';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import NewMatchAssignTeams, {
    Player,
} from '@/components/screens/NewMatchAssignTeams';
import { triggerHapticBump } from '@/haptics';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

const { width } = Dimensions.get('window');

function getRandomPlayers(ids: string[]) {
    const shuffledPlayers = ids
        .map((i) => ({ id: i }))
        .sort(() => Math.random() - 0.5);
    const half = Math.floor(shuffledPlayers.length / 2);
    const blueTeam = shuffledPlayers.slice(0, half);
    const redTeam = shuffledPlayers.slice(half);

    return [blueTeam, redTeam];
}

export default function NewMatchScreen() {
    const { beerpongProMode } = useLocalSettings();

    const scrollX = useSharedValue(0);

    // float between 0 and 1
    const animationProgress = useDerivedValue(
        () => (scrollX.value / width ** 2) * -1,
        [scrollX]
    );

    const nav = useNavigation();

    const { groupId, seasonId, group } = useGroup();

    const minTeamSize =
        group.data?.activeSeason?.seasonSettings?.minTeamSize ?? 1;
    const maxTeamSize =
        group.data?.activeSeason?.seasonSettings?.maxTeamSize ?? 10;

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const matchDraft = useMatchDraftStore();

    const profiles = (playersQuery.data?.data ?? [])
        .filter((i) => i.activeThisSeason)
        .map<Player>((i) => ({
            id: i.id!,
            name: i.profile?.name || 'Unknown',
            team:
                matchDraft.actions.getPlayers().find((j) => i.id === j.playerId)
                    ?.team ?? null,

            avatarUrl: i.profile?.avatarAsset?.url,
        }));

    const hasValidTeams =
        matchDraft.redTeam.teamMembers.length >= minTeamSize &&
        matchDraft.blueTeam.teamMembers.length >= minTeamSize &&
        matchDraft.redTeam.teamMembers.length <= maxTeamSize &&
        matchDraft.blueTeam.teamMembers.length <= maxTeamSize;

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

    const createMatchMutation = useCreateMatchMutation();

    const finishes = teamMembers
        .flatMap((i) => i.moves)
        .filter((i) => i.isFinish);

    const numFinishes = finishes.reduce((sum, i) => sum + i.count, 0);

    const isValidGame = numFinishes === 1;

    async function onCreateMatch() {
        if (!groupId || !seasonId) {
            ConsoleLogger.warn('no groupId or seasonId');
            return;
        }

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
            '#',
            group.data?.activeSeason?.seasonSettings?.rankingAlgorithm
        );
    }

    const [randomTeamsMode, setRandomTeamsMode] = useState<{
        players: string[];
    } | null>(null);

    return (
        <GestureHandlerRootView>
            <AppBackground />
            <NewMatchStack
                onCreateRandomTeams={() => {
                    const playersToRandomize = randomTeamsMode?.players ?? [];

                    if (playersToRandomize.length === 0) {
                        showErrorToast('Select players to randomize teams.');
                        return;
                    }
                    if (playersToRandomize.length < minTeamSize * 2) {
                        showErrorToast(
                            `Select at least ${minTeamSize * 2} players to randomize teams.`
                        );
                        return;
                    }
                    const [blueTeam, redTeam] =
                        getRandomPlayers(playersToRandomize);

                    matchDraft.actions.setTeams(blueTeam, redTeam);

                    triggerHapticBump('toast:success');

                    setRandomTeamsMode(null);
                }}
                randomTeamsMode={randomTeamsMode}
                onExitRandomTeamsMode={() => setRandomTeamsMode(null)}
                animationProgress={animationProgress}
                match={matchObj}
                onClear={() => {
                    matchDraft.actions.clear();
                    triggerHapticBump('selection');
                }}
                onBack={() => {
                    swiperRef.current?.scrollBy(-1);
                    carouselRef.current?.prev();
                }}
                onNext={() => {
                    swiperRef.current?.scrollBy(1);
                    carouselRef.current?.next();
                }}
                onCreate={onCreateMatch}
                isCreating={createMatchMutation.isPending}
            />
            <Carousel
                // kinda hacky, this is how we get the carousel to re-mount when switching groups or seasons.
                // it needs to re-mount so it starts at the first page again.
                // this fixes a bug where the carousel would start at the second page when switching groups or seasons.
                // i tried to manually go to the first page in a useEffect if teamMembers.length === 0,
                // but that caused a different issue where the form would submit twice, and i honestly can't be fucked rn.
                key={groupId + ':' + seasonId}
                ref={carouselRef}
                onProgressChange={(relativeOffset) => {
                    scrollX.value = relativeOffset * width;
                }}
                onSnapToItem={(pageIdx) => {
                    if (pageIdx === 1 && !matchDraft.hasBeenOnPageTwo) {
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
                data={beerpongProMode ? [null, null, null] : [null, null]}
                renderItem={(item) => {
                    if (item.index === 0) {
                        return (
                            <NewMatchAssignTeams
                                onRandomTeamSelect={(playerId) =>
                                    setRandomTeamsMode((prev) => ({
                                        players: prev!.players.includes(
                                            playerId
                                        )
                                            ? prev!.players.filter(
                                                  (p) => p !== playerId
                                              )
                                            : [...prev!.players, playerId],
                                    }))
                                }
                                randomTeamsMode={randomTeamsMode}
                                onRandomTeamsPress={() => {
                                    const playersToRandomize =
                                        matchDraft.blueTeam.teamMembers
                                            .map((i) => i.playerId)
                                            .concat(
                                                matchDraft.redTeam.teamMembers.map(
                                                    (i) => i.playerId
                                                )
                                            );
                                    if (playersToRandomize.length === 0) {
                                        setRandomTeamsMode({ players: [] });

                                        return;
                                    }
                                    if (
                                        playersToRandomize.length <
                                        minTeamSize * 2
                                    ) {
                                        showErrorToast(
                                            `Select at least ${minTeamSize * 2} players to randomize teams.`
                                        );
                                        return;
                                    }
                                    const [blueTeam, redTeam] =
                                        getRandomPlayers(playersToRandomize);

                                    matchDraft.actions.setTeams(
                                        blueTeam,
                                        redTeam
                                    );
                                }}
                                minTeamSize={minTeamSize}
                                maxTeamSize={maxTeamSize}
                                players={profiles}
                                setTeam={matchDraft.actions.setPlayerTeam}
                            />
                        );
                    }
                    if (item.index === 1) {
                        return (
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
                        );
                    }
                    if (item.index === 2) {
                        return <Cups />;
                    }
                    throw new Error('Invalid swiper index');
                }}
            />
        </GestureHandlerRootView>
    );
}
