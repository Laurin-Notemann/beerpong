import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useMatchesQuery } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import {
    LiveMatchOfflineError,
    LiveMatchScoreChangedError,
    useLiveMatch,
    useLiveMatchActions,
} from '@/api/liveMatch/useLiveMatch';
import { matchDtoToMatch, TeamMember } from '@/api/utils/matchDtoToMatch';
import { getDisplayMatch } from '@/lib/getDisplayMatch';
import { finishHint } from '@/lib/liveMatch/labels';
import { errorCode } from '@/lib/liveMatch/sync';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ScopedLogger } from '@/utils/logging';
import { liveMatchOutbox } from '@/zustand/liveMatchOutboxStore';
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

    // the match's own season: it may have started before the active one changed
    const seasonId = header?.seasonId || activeSeasonId;
    const playersQuery = usePlayersQuery(groupId, seasonId);
    const movesQuery = useMoves(groupId, seasonId);
    const matchesQuery = useMatchesQuery(groupId, seasonId);
    const moves = movesQuery.data?.data ?? [];
    const profiles = playersQuery.data?.data ?? [];

    const match = getDisplayMatch(
        draftPlayers(live.state),
        activeSeason?.seasonSettings?.rankingAlgorithm,
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

    async function finish() {
        if (isFinishing) return;
        setIsFinishing(true);
        try {
            const result = await actions.finish();
            setIsLeaving(true);
            showSuccessToast('Match saved.');
            router.replace({
                pathname: '/match',
                params: { id: result.matchId, seasonId: result.seasonId },
            });
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
            setIsFinishing(false);
        }
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
        isLoading: live.isLoading,
        /** couldn't be loaded for another reason than not existing (e.g. offline) */
        error: !header && !isNotFound ? live.error : null,
        ended,
        syncStatus: live.syncStatus,
        pendingCount: live.pendingCount,
        red: {
            players: match.redTeam.map(toBadgePlayer),
            score: match.redCups,
        },
        blue: {
            players: match.blueTeam.map(toBadgePlayer),
            score: match.blueCups,
        },
        teamMembers,
        hint: finishHint(finishes),
        isFinishing,
        finish,
        discard,
        viewResult,
        close: () => nav.goBack(),
        openPlayer: (player: TeamMember) =>
            nav.navigate('assignPointsToPlayerModal', {
                pageIdx: teamMembers.findIndex((i) => i.id === player.id),
                liveMatchId: id,
            }),
        /** the modal's pages after the players are where the finish is entered */
        openFinish: () =>
            nav.navigate('assignPointsToPlayerModal', {
                pageIdx: teamMembers.length,
                liveMatchId: id,
            }),
    };
}
