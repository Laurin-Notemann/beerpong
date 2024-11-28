import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { TeamMember } from '@/api/utils/matchDtoToMatch';
import AssignPointsToPlayerModal from '@/components/AssignPointsToPlayerModal';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const { pageIdx: initialPageIdx } = useLocalSearchParams<{
        pageIdx: string;
    }>();

    const nav = useNavigation();

    const [pageIdx, setPageIdx] = useState(parseInt(initialPageIdx));

    const matchDraft = useMatchDraftStore();

    const { groupId, seasonId } = useGroup();

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const profiles = playersQuery.data?.data ?? [];

    const players = matchDraft.actions.getPlayers();

    const teamMembers = players.map<TeamMember>((i) => {
        const profile = profiles.find((j) => i.playerId === j.id);

        if (!profile?.profile?.name) {
            throw new Error('failed to get profile for team member');
        }

        return {
            id: i.playerId,
            team: i.team,
            avatarUrl: profile.profile.avatarAsset?.url,
            name: profile.profile.name || 'Unknown',
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

    const match = {
        blueCups: players
            .filter((i) => i.team === 'blue')
            .map((i) => i.moves)
            .flat()
            .reduce((sum, i) => sum + i.count, 0),
        redCups: players
            .filter((i) => i.team === 'red')
            .map((i) => i.moves)
            .flat()
            .reduce((sum, i) => sum + i.count, 0),
        redTeam: teamMembers.filter((i) => i.team === 'red'),
        blueTeam: teamMembers.filter((i) => i.team === 'blue'),
    };

    return (
        <AssignPointsToPlayerModal
            onClose={nav.goBack}
            pageIdx={pageIdx}
            setPageIdx={setPageIdx}
            match={match}
            isVisible={pageIdx != null}
            setMoveCount={matchDraft.actions.setMoveCount}
        />
    );
}
