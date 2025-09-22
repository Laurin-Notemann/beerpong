import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import Swiper from 'react-native-swiper';

import {
    useCreateMatchMutation,
    useMatchesQuery,
    useUpdateMatchPhotoMutation,
} from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { AppBackground } from '@/app/Background';
import { getDisplayMatch } from '@/app/getDisplayMatch';
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

/**
 * whether the teams are equal (order-insensitive).
 * also true if teams are equal with switched colors, except when there are only two players total (1v1).
 */
const areTeamsEqual = (
    teams1: { red: string[]; blue: string[] },
    teams2: { red: string[]; blue: string[] }
) => {
    const sameMembers = (a: string[], b: string[]) => {
        if (a.length !== b.length) return false;
        const as = [...a].sort();
        const bs = [...b].sort();
        for (let i = 0; i < as.length; i++) if (as[i] !== bs[i]) return false;
        return true;
    };

    const isSame =
        sameMembers(teams1.red, teams2.red) &&
        sameMembers(teams1.blue, teams2.blue);
    const isSameWithSwitchedColors =
        sameMembers(teams1.blue, teams2.red) &&
        sameMembers(teams1.red, teams2.blue);

    // if total players is 2 (1v1), allow color switch to count as different
    const totalPlayers = teams1.red.length + teams1.blue.length;
    const anythingButColorSwitchPossible = totalPlayers > 2;

    const result =
        isSame || (isSameWithSwitchedColors && anythingButColorSwitchPossible);

    return result;
};

export default function NewMatchScreen() {
    const router = useRouter();
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

    const profiles = playersQuery.data?.data ?? [];

    const selectablePlayers = profiles
        .filter((i) => i.activeThisSeason)
        .map<Player>((i) => ({
            id: i.id!,
            name: i.profile?.name || 'Unknown',
            team:
                matchDraft.actions.getPlayers().find((j) => i.id === j.playerId)
                    ?.team ?? null,

            avatarUrl: i.profile?.avatarAsset?.url,
        }));

    const displayMatch = getDisplayMatch(
        matchDraft.actions.getPlayers(),
        group.data?.activeSeason?.seasonSettings?.rankingAlgorithm,
        playersQuery.data?.data ?? [],
        matches,
        movesQuery.data?.data ?? []
    );
    const teamMembers = displayMatch.blueTeam.concat(displayMatch.redTeam);

    const createMatchMutation = useCreateMatchMutation();

    const updateMatchPhotoMutation = useUpdateMatchPhotoMutation();

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
            const matchRes = await createMatchMutation.mutateAsync({
                groupId,
                seasonId,
                teams: [matchDraft.blueTeam, matchDraft.redTeam],
            });
            if (matchDraft.blueTeamPhotoUri && matchDraft.redTeamPhotoUri) {
                const blueByteArray = await uriToByteArray(
                    matchDraft.blueTeamPhotoUri
                );
                const redByteArray = await uriToByteArray(
                    matchDraft.redTeamPhotoUri
                );

                await updateMatchPhotoMutation.mutateAsync({
                    groupId,
                    seasonId,
                    matchId: matchRes?.data?.id!,
                    mimeType: 'image/png',
                    byteArray: blueByteArray,
                    teamId: matchRes?.data?.teams?.[0].id!,
                });

                await updateMatchPhotoMutation.mutateAsync({
                    groupId,
                    seasonId,
                    matchId: matchRes?.data?.id!,
                    mimeType: 'image/png',
                    byteArray: redByteArray,
                    teamId: matchRes?.data?.teams?.[1].id!,
                });
            }
            matchDraft.actions.clear();
            showSuccessToast('Created match.');

            router.dismissAll();
            router.replace('/');
            swiperRef.current?.scrollBy(-1);
            carouselRef.current?.prev();
        } catch (err) {
            ConsoleLogger.error('failed to create match:', err);
            showErrorToast('Failed to create match.');
        }
    }

    const [randomTeamsMode, setRandomTeamsMode] = useState<{
        players: string[];
    } | null>(null);

    function randomize(playersToRandomize: string[]) {
        if (playersToRandomize.length < minTeamSize * 2) {
            showErrorToast(
                `Select at least ${minTeamSize * 2} players to randomize teams.`
            );
            return;
        }

        let newTeams: { red: string[]; blue: string[] } | null = null;

        while (
            !newTeams ||
            areTeamsEqual(newTeams, {
                blue: matchDraft.blueTeam.teamMembers.map((i) => i.playerId),
                red: matchDraft.redTeam.teamMembers.map((i) => i.playerId),
            })
        ) {
            const [blueTeam, redTeam] = getRandomPlayers(playersToRandomize);

            newTeams = {
                blue: blueTeam.map((i) => i.id),
                red: redTeam.map((i) => i.id),
            };
        }

        matchDraft.actions.setTeams(
            newTeams.red.map((id) => ({ id })),
            newTeams.blue.map((id) => ({ id }))
        );
        triggerHapticBump('toast:success');

        setRandomTeamsMode(null);
    }

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
                    randomize(playersToRandomize);
                }}
                randomTeamsMode={randomTeamsMode}
                onExitRandomTeamsMode={() => setRandomTeamsMode(null)}
                animationProgress={animationProgress}
                match={displayMatch}
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
                                    randomize(playersToRandomize);
                                }}
                                minTeamSize={minTeamSize}
                                maxTeamSize={maxTeamSize}
                                players={selectablePlayers}
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

export async function uriToByteArray(uri: string) {
    const resp = await fetch(uri);
    const buffer = await resp.arrayBuffer();
    const byteArray = new Uint8Array(buffer);

    return byteArray;
}
