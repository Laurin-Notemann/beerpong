import React from 'react';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { useCreateMatchMutation } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { TeamMember } from '@/components/MatchPlayers';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const nav = useNavigation();

    const { selectedGroupId } = useGroupStore();

    const { data: groupQueryData } = useGroupQuery(selectedGroupId);

    const activeSeasonId = groupQueryData?.data?.activeSeason?.id;

    const playersQuery = usePlayersQuery(selectedGroupId, activeSeasonId);

    const movesQuery = useMoves(selectedGroupId, activeSeasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const matchDraft = useMatchDraftStore();

    const players = matchDraft.actions.getPlayers();

    const profiles = playersQuery.data?.data ?? [];

    // TODO: isFinish, pointsForTeam, stuff like that

    const teamMembers = players.map<TeamMember>((i) => {
        const profile = profiles.find((j) => i.playerId! === j.id!);

        if (!profile?.profile?.name) {
            throw new Error('failed to get profile for team member');
        }

        return {
            id: i.playerId,
            team: i.team,
            name: profile.profile.name,
            points: 1,
            change: 0.12,
            moves: allowedMoves.map((j) => ({
                id: j.id!,
                count: i.moves.find((k) => k.moveId === j.id)?.count ?? 0,
                title: j.name!,
                points: j.pointsForScorer!,
            })),
        };
    });

    const { mutateAsync } = useCreateMatchMutation();

    async function onSubmit() {
        await mutateAsync({
            teams: [matchDraft.blueTeam, matchDraft.redTeam],
        });
        nav.navigate('index');
    }

    return (
        <CreateMatchAssignPoints
            players={teamMembers}
            setMoveCount={matchDraft.actions.setMoveCount}
            onSubmit={onSubmit}
        />
    );
}
