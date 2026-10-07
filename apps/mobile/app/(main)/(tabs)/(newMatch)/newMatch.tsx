import { onlineManager } from '@tanstack/react-query';
import { uuid } from 'expo';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import {
    useCreateMatchMutation,
    useMatchesQuery,
} from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { startLiveMatch } from '@/api/liveMatch/useLiveMatch';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { NewMatchStack } from '@/components/NewMatchStack';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import NewMatchAssignTeams, {
    Player,
} from '@/components/screens/NewMatchAssignTeams';
import {
    scrollControlledSwipers,
    Swiper,
    SwiperRef,
} from '@/components/Swiper';
import { triggerHapticBump } from '@/haptics';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { AppBackground } from '@/lib/Background';
import { getDisplayMatch } from '@/lib/getDisplayMatch';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { RematchParams, useOfferRematch } from '@/lib/useOfferRematch';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';
import { draftPlayers } from '@/zustand/matchEditDraftStore';
import { useScopePicker } from '@/zustand/useScopePicker';

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
    const offerRematch = useOfferRematch();

    const { groupId, seasonId, activeSeason } = useGroup();

    const minTeamSize = activeSeason?.seasonSettings?.minTeamSize ?? 1;
    const maxTeamSize = activeSeason?.seasonSettings?.maxTeamSize ?? 10;

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const matchDraft = useMatchDraftStore();
    const scopePicker = useScopePicker();

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

    // pro mode: Start match either goes live (see liveMatch.tsx) or, for a game that's already
    // over, on to its points here; nobody remembers which cups were hit afterwards
    const pages = ['teams', 'points'] as const;

    const profiles = playersQuery.data?.data ?? [];

    const selectablePlayers = profiles
        .filter((i) => i.activeThisSeason)
        .map<Player>((i) => ({
            id: i.id!,
            name: i.profile?.name || 'Unknown',
            team:
                draftPlayers(matchDraft).find((j) => i.id === j.playerId)
                    ?.team ?? null,

            avatarUrl: i.profile?.avatarUrl,
        }));

    const displayMatch = getDisplayMatch(
        draftPlayers(matchDraft),
        activeSeason?.seasonSettings?.rankingAlgorithm,
        playersQuery.data?.data ?? [],
        matches,
        movesQuery.data?.data ?? []
    );
    const teamMembers = displayMatch.blueTeam.concat(displayMatch.redTeam);
    const bothTeamsEmpty = teamMembers.length === 0;

    const createMatchMutation = useCreateMatchMutation();

    const finishes = teamMembers
        .flatMap((i) => i.moves)
        .filter((i) => i.isFinish);

    const numFinishes = finishes.reduce((sum, i) => sum + i.count, 0);

    const isValidGame = numFinishes === 1;

    const [onCreateMatch, isCreating] = useSingleFlight(async () => {
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

        // the draft as it is now: a second tap before the next render finds it cleared
        const draft = useMatchDraftStore.getState();
        const { blueTeamPhotoUri, redTeamPhotoUri } = draft;
        if (!draft.blueTeam.teamMembers.length) return;

        // made here, so a create that is sent again (a retry, after a restart) saves it once
        const matchId = uuid.v4();
        const savePhoto = !!blueTeamPhotoUri && !!redTeamPhotoUri;

        // not awaited: offline, the match waits on the phone and is sent once it's back online
        createMatchMutation.mutate({
            id: matchId,
            groupId,
            seasonId,
            teams: [
                { ...draft.blueTeam, savePhoto },
                { ...draft.redTeam, savePhoto },
            ],
            enteredAt: new Date().toISOString(),
            photos: savePhoto
                ? { blueTeamPhotoUri, redTeamPhotoUri }
                : undefined,
        });

        matchDraft.actions.clear();

        const rematch: RematchParams = {
            groupId,
            seasonId,
            rematch: 'draft',
            redPlayerIds: draft.redTeam.teamMembers
                .map((i) => i.playerId)
                .join(','),
            bluePlayerIds: draft.blueTeam.teamMembers
                .map((i) => i.playerId)
                .join(','),
        };

        // show the new match where it lands: the current season, today
        scopePicker.setIsPastSeasonsMode(false);
        scrollControlledSwipers(scopePicker.leaderboardSwiperProgress, 0);
        router.dismissAll();
        router.replace('/');
        carouselRef.current?.prev();

        if (!onlineManager.isOnline()) {
            showSuccessToast("Saved. It's sent when you're back online.");
        }
        if (!savePhoto && onlineManager.isOnline()) {
            // no photo was taken on the points page, so ask for one
            nav.navigate('matchPhotoModal', { matchId, ...rematch });
        } else {
            offerRematch(rematch);
        }
    });

    // a second tap in the same frame is ignored; after that the cleared draft has no teams
    const isStarting = useRef(false);

    /** pro mode: the match goes live right away, also offline; this tab is free for the next one */
    function onStartLiveMatch() {
        if (!groupId || !seasonId) {
            ConsoleLogger.warn('no groupId or seasonId');
            return;
        }
        if (isStarting.current) return;

        // the draft as it is now, not as it was when this screen last rendered
        const { redTeam, blueTeam, actions } = useMatchDraftStore.getState();
        if (explainTeams()) return;

        isStarting.current = true;
        requestAnimationFrame(() => {
            isStarting.current = false;
        });

        const id = startLiveMatch({
            groupId,
            seasonId,
            redPlayerIds: redTeam.teamMembers.map((i) => i.playerId),
            bluePlayerIds: blueTeam.teamMembers.map((i) => i.playerId),
        });
        actions.clear();
        triggerHapticBump('toast:success');
        nav.navigate('liveMatch', { id });
    }

    function onEnterAfterGame() {
        if (explainTeams()) return;
        carouselRef.current?.next();
    }

    /**
     * pro mode's Start match stays tappable while the teams can't play yet, and says why. True
     * if it did.
     */
    function explainTeams() {
        const { redTeam, blueTeam } = useMatchDraftStore.getState();
        const min = Math.max(1, minTeamSize);

        for (const [name, team] of [
            ['Red', redTeam],
            ['Blue', blueTeam],
        ] as const) {
            const size = team.teamMembers.length;
            const problem =
                size < min
                    ? `Select ${min === 1 ? 'a player' : `at least ${min} players`} for the ${name.toLowerCase()} team.`
                    : size > maxTeamSize
                      ? `${name} team can have at most ${maxTeamSize} players.`
                      : undefined;

            if (problem) {
                showErrorToast(problem);
                return true;
            }
        }
        return false;
    }

    /** Android's in-page Start match button; iOS asks in the toolbar's menu */
    function chooseStart() {
        if (explainTeams()) return;

        Alert.alert('Start match', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'After the game', onPress: onEnterAfterGame },
            { text: 'Live match', onPress: onStartLiveMatch },
        ]);
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
                onBack={() => {
                    carouselRef.current?.prev();
                }}
                onNext={() => {
                    carouselRef.current?.next();
                }}
                onCreate={onCreateMatch}
                isCreating={isCreating}
                onStart={beerpongProMode ? onStartLiveMatch : undefined}
                onEnterAfterGame={onEnterAfterGame}
                canStart={hasValidTeams}
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
                    if (
                        pages[pageIdx] === 'points' &&
                        !matchDraft.hasBeenOnPageTwo
                    ) {
                        nav.navigate('assignPointsToPlayerModal', {
                            pageIdx: 0,
                        });
                        matchDraft.actions.setHasBeenOnPageTwo();
                    }
                    setSwiperPage(pageIdx);
                }}
                // in pro mode, leaving the teams page is Start match's choice
                enabled={
                    !(swiperPage === 0 && (!hasValidTeams || beerpongProMode))
                }
            >
                {pages.map((page) => {
                    if (page === 'teams') {
                        return (
                            <NewMatchAssignTeams
                                key={page}
                                onClear={
                                    bothTeamsEmpty
                                        ? undefined
                                        : () => {
                                              matchDraft.actions.clear();
                                              triggerHapticBump('selection');
                                          }
                                }
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
                                onStart={
                                    beerpongProMode && Platform.OS === 'android'
                                        ? chooseStart
                                        : undefined
                                }
                            />
                        );
                    }
                    return (
                        <CreateMatchAssignPoints
                            key={page}
                            isPending={isCreating}
                            players={teamMembers}
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
                })}
            </Swiper>
        </GestureHandlerRootView>
    );
}
