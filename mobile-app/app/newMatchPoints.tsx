import React, { useState } from 'react';

import { useGroupQuery } from '@/api/calls/groupHooks';
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

    // TODO: associate move with playerId and count

    const matchDraft = useMatchDraftStore();

    const newPlayers = matchDraft.actions.getPlayers();

    const profiles = playersQuery.data?.data ?? [];

    // TODO: isFinish, pointsForTeam, stuff like that

    const teamMembers = newPlayers.map<TeamMember>((i) => {
        const profile = profiles.find((j) => i.id! === j.id!);

        if (!profile?.profile?.name) {
            throw new Error('failed to get profile for team member');
        }

        return {
            ...i,
            name: profile.profile.name,
            points: 1,
            change: 0.12,
            moves: allowedMoves.map((j) => ({
                id: j.id!,
                count: i.moves.find((k) => k.id === j.id)?.count ?? 0,
                title: j.name!,
                points: j.pointsForScorer!,
            })),
        };
    });

    async function onSubmit() {
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
