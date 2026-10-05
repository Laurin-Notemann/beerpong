import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { attachTeamPhotos, useMatchesQuery } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup, useSeasonQuery } from '@/api/calls/seasonHooks';
import {
    useLiveMatch,
    useLiveMatchActions,
} from '@/api/liveMatch/useLiveMatch';
import { useApi } from '@/api/utils/create-api';
import { matchDtoToMatch, TeamMember } from '@/api/utils/matchDtoToMatch';
import { QK } from '@/api/utils/reactQuery';
import { getDisplayMatch } from '@/lib/getDisplayMatch';
import {
    LiveMatchOfflineError,
    LiveMatchScoreChangedError,
} from '@/lib/liveMatch/finish';
import { finishHint } from '@/lib/liveMatch/labels';
import { errorCode } from '@/lib/liveMatch/sync';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ScopedLogger } from '@/utils/logging';
import { liveMatchOutbox } from '@/zustand/liveMatchOutboxStore';
import { useLiveMatchPhotoStore } from '@/zustand/liveMatchPhotoStore';
import { draftPlayers } from '@/zustand/matchEditDraftStore';

const logger = new ScopedLogger('live-match');

const toBadgePlayer = (i: TeamMember) => ({
    id: i.id,
    name: i.name,
    avatarUrl: i.avatarUrl,
});

/** Everything the live match screen shows and does, so the screen itself only lays it out. */
export function useLiveMatchScreen(id: string) {
    const router = useRouter();
    const nav = useNavigation();
    const { groupId, seasonId: activeSeasonId, activeSeason } = useGroup();

    const live = useLiveMatch(groupId ?? '', id);
    const actions = useLiveMatchActions(groupId ?? '', id);
    const header = live.liveMatch;
    const { api } = useApi();
    const qc = useQueryClient();

    // the match's own season: it may have started before the active one changed
    const seasonId = header?.seasonId || activeSeasonId;
    const playersQuery = usePlayersQuery(groupId, seasonId);
    const movesQuery = useMoves(groupId, seasonId);
    const matchesQuery = useMatchesQuery(groupId, seasonId);
    const seasonQuery = useSeasonQuery(groupId, seasonId ?? null);
    const rankingAlgorithm =
        seasonQuery.data?.data?.seasonSettings?.rankingAlgorithm ??
        (seasonId === activeSeasonId
            ? activeSeason?.seasonSettings?.rankingAlgorithm
            : undefined);
    const moves = movesQuery.data?.data ?? [];
    const profiles = playersQuery.data?.data ?? [];

    const match = getDisplayMatch(
        draftPlayers(live.state),
        rankingAlgorithm,
        profiles,
        matchesQuery.data?.data?.map(matchDtoToMatch(profiles, moves)) ?? [],
        moves
    );
    // the order the points modal pages through the players
    const teamMembers = match.blueTeam.concat(match.redTeam);
    const finishes = teamMembers
        .flatMap((i) => i.moves)
        .filter((i) => i.isFinish)
        .reduce((sum, i) => sum + i.count, 0);

    // the dock opens the match this phone looked at last
    useEffect(() => {
        if (groupId && id) liveMatchOutbox().actions.setLastOpened(groupId, id);
    }, [groupId, id]);

    // set once this screen is on its way out, so it doesn't flash the ended state meanwhile
    const [isLeaving, setIsLeaving] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);

    const isNotFound = !header && errorCode(live.error) === 'liveMatchNotFound';
    // a finish from this phone ends the match in the cache just before the screen moves on
    const ended =
        isLeaving || isFinishing
            ? undefined
            : header?.status === 'FINISHED'
              ? ('finished' as const)
              : header?.status === 'ABANDONED' || isNotFound
                ? ('discarded' as const)
                : undefined;

    // a second tap lands before the re-render that disables the button
    const finishInFlight = useRef(false);
    // finishing can take seconds; only move on if the user is still looking at this screen
    const isFocused = useIsFocused();
    const isFocusedRef = useRef(isFocused);
    useEffect(() => {
        isFocusedRef.current = isFocused;
        return () => {
            isFocusedRef.current = false;
        };
    }, [isFocused]);

    // a team photo taken on this phone during the match goes onto the match once it's finished
    const isAttaching = useRef(false);
    /** starts attaching this phone's team photo, if it took one; returns whether it did */
    function attachPhoto(matchId: string, seasonId: string) {
        const photos = useLiveMatchPhotoStore.getState().photos[id];
        if (!photos || !groupId || isAttaching.current) return !!photos;

        isAttaching.current = true;
        attachTeamPhotos(api, { groupId, seasonId, matchId }, photos)
            .then(() => {
                useLiveMatchPhotoStore.getState().actions.set(id, null);
                qc.invalidateQueries({
                    queryKey: [
                        QK.group,
                        groupId,
                        QK.season,
                        seasonId,
                        QK.matches,
                    ],
                });
            })
            .catch((err) => {
                logger.error('failed to attach the team photo', id, err);
                showErrorToast(
                    "The match is saved, but its team photo couldn't be uploaded.",
                    err
                );
            })
            .finally(() => {
                isAttaching.current = false;
            });
        return true;
    }

    // finished on another phone: attach this phone's photo too
    const resultMatchId =
        header?.status === 'FINISHED' ? header.resultMatchId : undefined;
    const resultSeasonId = header?.seasonId;
    const onFinished = useEffectEvent(attachPhoto);
    useEffect(() => {
        if (resultMatchId && resultSeasonId) {
            onFinished(resultMatchId, resultSeasonId);
        }
    }, [resultMatchId, resultSeasonId]);

    async function finish() {
        if (finishInFlight.current) return;
        finishInFlight.current = true;
        setIsFinishing(true);
        try {
            const result = await actions.finish();
            showSuccessToast('Match saved.');
            if (!isFocusedRef.current) return;
            setIsLeaving(true);
            router.replace({
                pathname: '/match',
                params: { id: result.matchId, seasonId: result.seasonId },
            });
            if (!attachPhoto(result.matchId, result.seasonId)) {
                // no team photo was taken during the match, so ask for one
                nav.navigate('matchPhotoModal', {
                    matchId: result.matchId,
                    seasonId: result.seasonId,
                });
            }
        } catch (err) {
            if (err instanceof LiveMatchOfflineError) {
                showErrorToast(
                    "You're offline. The match is kept — finish when you're back online."
                );
            } else if (err instanceof LiveMatchScoreChangedError) {
                showErrorToast(
                    'The score just changed — check it and finish again.'
                );
            } else {
                logger.error('failed to finish live match', id, err);
                showErrorToast("Couldn't finish the match.", err);
            }
        } finally {
            finishInFlight.current = false;
            setIsFinishing(false);
        }
    }

    const hint = finishHint(finishes);
    const openFinish = () =>
        nav.navigate('assignPointsToPlayerModal', {
            pageIdx: teamMembers.length,
            liveMatchId: id,
        });

    /** the header's check mark: saves the match, or says what's missing and opens the finish */
    function finishOrExplain() {
        if (hint) {
            showErrorToast(hint + '.');
            openFinish();
            return;
        }
        finish();
    }

    function discard() {
        Alert.alert('Discard match?', "It ends for everyone and won't count.", [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                    setIsLeaving(true);
                    actions.discard();
                    useLiveMatchPhotoStore.getState().actions.set(id, null);
                    nav.goBack();
                },
            },
        ]);
    }

    function viewResult() {
        const matchId = header?.resultMatchId;
        if (!matchId) {
            nav.goBack();
            return;
        }
        setIsLeaving(true);
        router.replace({
            pathname: '/match',
            params: { id: matchId, seasonId: header.seasonId },
        });
    }

    return {
        header,
        /** couldn't be loaded for another reason than not existing (e.g. offline) */
        error: !header && !isNotFound ? live.error : null,
        ended,
        red: {
            players: match.redTeam.map(toBadgePlayer),
            score: match.redCups,
        },
        blue: {
            players: match.blueTeam.map(toBadgePlayer),
            score: match.blueCups,
        },
        teamMembers,
        hint,
        isFinishing,
        finish,
        finishOrExplain,
        discard,
        viewResult,
        close: () => nav.goBack(),
        openPlayer: (player: TeamMember) =>
            nav.navigate('assignPointsToPlayerModal', {
                pageIdx: teamMembers.findIndex((i) => i.id === player.id),
                liveMatchId: id,
            }),
        /** the modal's pages after the players are where the finish is entered */
        openFinish,
        openTeams: () =>
            nav.navigate('liveMatchTeamsModal', { liveMatchId: id }),
    };
}
