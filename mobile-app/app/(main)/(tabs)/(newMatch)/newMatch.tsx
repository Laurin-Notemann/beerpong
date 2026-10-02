import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import {
    uploadTeamPhoto,
    useCreateMatchMutation,
    useMatchesQuery,
} from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import Cups from '@/app/(main)/startLiveMatch';
import { NewMatchStack } from '@/components/NewMatchStack';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import NewMatchAssignTeams, {
    Player,
} from '@/components/screens/NewMatchAssignTeams';
import { Swiper, SwiperRef } from '@/components/Swiper';
import { triggerHapticBump } from '@/haptics';
import { AppBackground } from '@/lib/Background';
import { getDisplayMatch } from '@/lib/getDisplayMatch';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

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

    // page progress of the swiper, float between 0 and the last page index
    const animationProgress = useSharedValue(0);

    const nav = useNavigation();

    const { groupId, seasonId, activeSeason } = useGroup();

    const minTeamSize = activeSeason?.seasonSettings?.minTeamSize ?? 1;
    const maxTeamSize = activeSeason?.seasonSettings?.maxTeamSize ?? 10;

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

    const carouselRef = useRef<SwiperRef>(null);

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

            avatarUrl: i.profile?.avatarUrl,
        }));

    const displayMatch = getDisplayMatch(
        matchDraft.actions.getPlayers(),
        activeSeason?.seasonSettings?.rankingAlgorithm,
        playersQuery.data?.data ?? [],
        matches,
        movesQuery.data?.data ?? []
    );
    const teamMembers = displayMatch.blueTeam.concat(displayMatch.redTeam);

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

        const { blueTeamPhotoUri, redTeamPhotoUri } = matchDraft;

        const savePhoto = !!blueTeamPhotoUri && !!redTeamPhotoUri;

        try {
            const matchRes = await createMatchMutation.mutateAsync({
                groupId,
                seasonId,
                teams: [
                    { ...matchDraft.blueTeam, savePhoto },
                    { ...matchDraft.redTeam, savePhoto },
                ],
            });
            if (blueTeamPhotoUri && redTeamPhotoUri) {
                // the upload urls are returned in the same order as the teams
                const [bluePhotoUpload, redPhotoUpload] =
                    matchRes?.data?.photoUploads ?? [];

                await uploadTeamPhoto(bluePhotoUpload, blueTeamPhotoUri);
                await uploadTeamPhoto(redPhotoUpload, redTeamPhotoUri);
            }
            matchDraft.actions.clear();
            showSuccessToast('Created match.');

            router.dismissAll();
            router.replace('/');
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
                    carouselRef.current?.prev();
                }}
                onNext={() => {
                    carouselRef.current?.next();
                }}
                onCreate={onCreateMatch}
                isCreating={createMatchMutation.isPending}
            />
            <Swiper
                // kinda hacky, this is how we get the carousel to re-mount when switching groups or seasons.
                // it needs to re-mount so it starts at the first page again.
                // this fixes a bug where the carousel would start at the second page when switching groups or seasons.
                // i tried to manually go to the first page in a useEffect if teamMembers.length === 0,
                // but that caused a different issue where the form would submit twice, and i honestly can't be fucked rn.
                key={groupId + ':' + seasonId}
                ref={carouselRef}
                swiperProgress={animationProgress}
                onPageChange={(pageIdx) => {
                    if (pageIdx === 1 && !matchDraft.hasBeenOnPageTwo) {
                        nav.navigate('assignPointsToPlayerModal', {
                            pageIdx: 0,
                        });
                        matchDraft.actions.setHasBeenOnPageTwo();
                    }
                    setSwiperPage(pageIdx);
                }}
                enabled={!(swiperPage === 0 && !hasValidTeams)}
            >
                {(beerpongProMode ? [0, 1, 2] : [0, 1]).map((index) => {
                    const item = { index };
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
                })}
            </Swiper>
        </GestureHandlerRootView>
    );
}
