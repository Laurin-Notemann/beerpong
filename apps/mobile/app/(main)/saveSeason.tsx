import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useMatchesQuery } from '@/api/calls/matchHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import {
    useEndSeasonMutation,
    useGroup,
    useStartNewSeasonMutation,
} from '@/api/calls/seasonHooks';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { SaveSeasonScreen } from '@/components/screens/SaveSeason';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { Components } from '@/openapi/openapi';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const nav = useNavigation();
    const router = useRouter();

    const { mode } = useLocalSearchParams<{ mode?: 'end' }>();

    const { groupId, seasonId, activeSeason } = useGroup();

    // ended with "End Season": the next season starts without naming it again
    const oldSeasonEnded = activeSeason?.endDate != null;

    const newSeasonMutation = useStartNewSeasonMutation();
    const endSeasonMutation = useEndSeasonMutation();

    const qc = useQueryClient();

    const matchDraft = useMatchDraftStore((store) => store.actions);

    const [onStartNewSeason, isCreating] = useSingleFlight(
        async (
            draftName: string,
            ruleMoves: Components.Schemas.RuleMoveCreateDto[]
        ) => {
            if (!groupId) return;
            const oldSeasonName =
                (oldSeasonEnded && activeSeason?.name) || draftName;
            try {
                await newSeasonMutation.mutateAsync({
                    groupId,
                    oldSeasonName,
                    ruleMoves,
                });

                void qc.invalidateQueries({
                    queryKey: ['groups', groupId],
                    exact: false,
                });
                router.replace('/');
                matchDraft.clear();
                showSuccessToast(
                    oldSeasonEnded
                        ? 'Started a new season.'
                        : `Saved current leaderboard as "${oldSeasonName}".`
                );
                router.dismissAll();
                router.replace('/');
            } catch (err) {
                ConsoleLogger.error('failed to start new season:', err);
                showErrorToast("Couldn't start the new season.", err);
            }
        }
    );

    const [onEndSeason, isEnding] = useSingleFlight(async (name: string) => {
        if (!groupId) return;
        try {
            await endSeasonMutation.mutateAsync({ groupId, name });
            void qc.invalidateQueries({
                queryKey: ['groups', groupId],
                exact: false,
            });
            showSuccessToast(`Ended the season as "${name}".`);
            nav.goBack();
        } catch (err) {
            ConsoleLogger.error('failed to end season:', err);
            showErrorToast("Couldn't end the season.", err);
        }
    });

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const minMatchesRequiredToBeRanked = 1;

    const { currentSeasonPlayers } = useLeaderboardProps(
        groupId,
        seasonId ?? null
    );

    // ordered by the podium, which ranks them
    const rankedPlayers = currentSeasonPlayers.filter(
        (i) => i.matches >= minMatchesRequiredToBeRanked
    );

    const matchesQuery = useMatchesQuery(groupId, seasonId);

    const matches = matchesQuery.data?.data ?? [];

    return (
        <SaveSeasonScreen
            onStartNewSeason={onStartNewSeason}
            onEndSeason={mode === 'end' ? onEndSeason : undefined}
            oldSeasonEnded={oldSeasonEnded}
            numMatches={matches.length}
            players={rankedPlayers}
            oldSeasonMoves={allowedMoves}
            oldSeasonStartDate={activeSeason?.startDate ?? ''}
            onCancel={() => nav.goBack()}
            isCreating={isCreating || isEnding}
            rankingAlgorithm={
                activeSeason?.seasonSettings?.rankingAlgorithm ?? 'AVERAGE'
            }
        />
    );
}
