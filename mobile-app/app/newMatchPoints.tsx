import React from 'react';
import Toast from 'react-native-root-toast';

import { useCreateMatchMutation } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { TeamMember } from '@/components/MatchPlayers';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const nav = useNavigation();

    const matchDraft = useMatchDraftStore();

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
            name: profile.profile.name || 'Unknown',
            points: 1,
            change: 0.12,
            moves: allowedMoves.map((j) => {
                return {
                    id: j.id!,
                    count: i.moves.find((k) => k.moveId === j.id)?.count ?? 0,
                    title: j.name || 'Unknown',
                    points: j.pointsForScorer!,
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
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to create match:', err);
            Toast.show('Failed to create match.', {
                duration: 1500,
                position: 1,
            });
        }
    }

    return (
        <CreateMatchAssignPoints
            players={teamMembers}
            setMoveCount={matchDraft.actions.setMoveCount}
            onSubmit={onSubmit}
        />
    );
}
