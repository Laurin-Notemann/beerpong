import { useQueryClient } from '@tanstack/react-query';

import { useMatchesQuery } from '@/api/calls/matchHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup, useStartNewSeasonMutation } from '@/api/calls/seasonHooks';
import {
    byDescendingAveragePoints,
    useLeaderboardProps,
} from '@/api/propHooks/leaderboardPropHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { Components } from '@/openapi/openapi';
import { SaveSeasonScreen } from '@/screens/SaveSeason';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId, group } = useGroup();

    const newSeasonMutation = useStartNewSeasonMutation();

    const qc = useQueryClient();

    const matchDraft = useMatchDraftStore((store) => store.actions);

    async function onStartNewSeason(
        oldSeasonName: string,
        ruleMoves: Components.Schemas.RuleMoveDto[]
    ) {
        if (!groupId) return;
        try {
            await newSeasonMutation.mutateAsync({
                groupId,
                oldSeasonName,
                ruleMoves,
            });

            qc.invalidateQueries({
                queryKey: ['groups', groupId],
                exact: false,
            });
            nav.navigate('index');
            matchDraft.clear();
            showSuccessToast(
                `Saved current leaderboard as "${oldSeasonName}".`
            );
        } catch (err) {
            ConsoleLogger.error('failed to start new season:', err);
            showErrorToast('Failed to create start new season.');
        }
    }

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const minMatchesRequiredToBeRanked = 1;

    const { currentSeasonPlayers } = useLeaderboardProps(
        groupId,
        seasonId ?? null
    );

    const sortedPlayers = currentSeasonPlayers.sort(byDescendingAveragePoints);

    const rankedPlayers = sortedPlayers.filter(
        (i) => i.matches >= minMatchesRequiredToBeRanked
    );

    const matchesQuery = useMatchesQuery(groupId, seasonId);

    const matches = matchesQuery.data?.data ?? [];

    return (
        <SaveSeasonScreen
            onStartNewSeason={onStartNewSeason}
            numMatches={matches.length}
            players={rankedPlayers}
            oldSeasonMoves={allowedMoves}
            oldSeasonStartDate={group.data?.activeSeason?.startDate!}
            onCancel={() => nav.goBack()}
            isCreating={newSeasonMutation.isPending}
        />
    );
}
