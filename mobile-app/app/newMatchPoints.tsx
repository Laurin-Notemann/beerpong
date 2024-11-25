import React, { useState } from 'react';

import { useCreateMatchMutation } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { useNavigation } from '@/app/navigation/useNavigation';
import AssignPointsToPlayerModal from '@/components/AssignPointsToPlayerModal';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import { Feature } from '@/constants/Features';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const nav = useNavigation();

    const matchDraft = useMatchDraftStore();

    const [playerIdx, setPlayerIdx] = useState<number | null>(null);

    const { mutateAsync } = useCreateMatchMutation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const profiles = playersQuery.data?.data ?? [];

    const players = matchDraft.actions.getPlayers();

    // TODO: isFinish, pointsForTeam, stuff like that

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
            points: 1,
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

    async function onSubmit() {
        if (!groupId || !seasonId) return;

        try {
            await mutateAsync({
                groupId,
                seasonId,
                teams: [matchDraft.blueTeam, matchDraft.redTeam],
            });
            matchDraft.actions.clear();
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to create match:', err);
            showErrorToast('Failed to create match.');
        }
    }

    return (
        <>
            {Feature.POINTS_ASSIGNMENT_MODAL.isEnabled && (
                <AssignPointsToPlayerModal
                    onClose={() => setPlayerIdx(null)}
                    playerIdx={playerIdx!}
                    setPlayerIdx={setPlayerIdx}
                    match={{
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
                    }}
                    editable
                    isVisible={playerIdx != null}
                    setMoveCount={matchDraft.actions.setMoveCount}
                />
            )}
            <CreateMatchAssignPoints
                players={teamMembers}
                setMoveCount={matchDraft.actions.setMoveCount}
                onSubmit={onSubmit}
                onPlayerPress={(player) =>
                    setPlayerIdx(
                        teamMembers.findIndex((i) => i.id === player.id)
                    )
                }
            />
        </>
    );
}
