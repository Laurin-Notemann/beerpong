import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { MinimalMatch, TeamMember } from '@/api/utils/matchDtoToMatch';
import { countCups, cupsPerHit } from '@/api/utils/ruleMoveCups';
import AssignPointsToPlayerModal from '@/components/AssignPointsToPlayerModal/index';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useCloseWhenEnded, useMatchEntry } from '@/lib/useMatchEntry';
import { ConsoleLogger } from '@/utils/logging';
import { draftPlayers } from '@/zustand/matchEditDraftStore';

export default function Page() {
    const { pageIdx: initialPageIdx, liveMatchId } = useLocalSearchParams<{
        pageIdx: string;
        liveMatchId?: string;
    }>();

    const nav = useNavigation();

    const entry = useMatchEntry(liveMatchId);
    useCloseWhenEnded(entry.isEnded);

    const { groupId } = useGroup();

    const movesQuery = useMoves(groupId, entry.seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const playersQuery = usePlayersQuery(groupId, entry.seasonId);

    const profiles = playersQuery.data?.data ?? [];

    const players = draftPlayers(entry);

    const teamMembers = players.map<TeamMember>((i) => {
        const profile = profiles.find((j) => i.playerId === j.id);

        if (!profile?.profile?.name) {
            ConsoleLogger.error('failed to get profile for team member');
        }

        return {
            id: i.playerId,
            team: i.team,
            avatarUrl: profile?.profile?.avatarUrl,
            name: profile?.profile?.name || 'Unknown',
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
                    cups: cupsPerHit(j),
                };
            }),
            profileId: '#',
        };
    });

    const match: MinimalMatch = {
        id: '#',
        date: new Date(),
        blueCups: countCups(
            teamMembers.filter((i) => i.team === 'blue').flatMap((i) => i.moves)
        ),
        redCups: countCups(
            teamMembers.filter((i) => i.team === 'red').flatMap((i) => i.moves)
        ),
        redTeam: teamMembers.filter((i) => i.team === 'red'),
        blueTeam: teamMembers.filter((i) => i.team === 'blue'),
    };

    return (
        <AssignPointsToPlayerModal
            onClose={nav.goBack}
            initialPageIdx={parseInt(initialPageIdx)}
            match={match}
            setMoveCount={entry.actions.setMoveCount}
        />
    );
}
