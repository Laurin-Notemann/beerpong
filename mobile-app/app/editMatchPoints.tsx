import { useLocalSearchParams } from 'expo-router';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useProfilesQuery } from '@/api/calls/profileHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { getAssetUrl } from '@/api/utils/assetUrl';
import { MinimalMatch, TeamMember } from '@/api/utils/matchDtoToMatch';
import { useNavigation } from '@/app/navigation/useNavigation';
import AssignPointsToPlayerModal from '@/components/AssignPointsToPlayerModal/index';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchEditDraftStore } from '@/zustand/matchEditDraftStore';

export default function Page() {
    const { pageIdx: initialPageIdx } = useLocalSearchParams<{
        pageIdx: string;
        match: string;
    }>();

    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const playersQuery = usePlayersQuery(groupId, seasonId);
    const profilesQuery = useProfilesQuery(groupId);

    const matchPlayers = playersQuery.data?.data ?? [];
    const profiles = profilesQuery.data?.data ?? [];

    const matchDraft = useMatchEditDraftStore();

    const players = matchDraft.actions.getPlayers();

    const teamMembers = players.map<TeamMember>((i) => {
        const player = matchPlayers.find((j) => i.playerId === j.id);
        const profile = profiles.find((j) => player?.profileId === j.id);

        if (!profile || !profile) {
            ConsoleLogger.error(
                'failed to get profile or player for team member'
            );
        }

        return {
            id: i.playerId,
            team: i.team,
            avatarUrl: getAssetUrl(profile?.assetIdAvatar),
            name: profile?.name || 'Unknown',
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
            profileId: profile?.id ?? '',
            playerId: '#',
        };
    });

    const displayMatch: MinimalMatch = {
        id: '#',
        date: new Date(),
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
            initialPageIdx={parseInt(initialPageIdx)}
            match={displayMatch}
            setMoveCount={matchDraft.actions.setMoveCount}
        />
    );
}
