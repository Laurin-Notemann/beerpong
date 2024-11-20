import { create } from 'zustand';

import { TeamId } from '@/components/screens/NewMatchAssignTeams';

interface MoveDraft {
    moveId: string;
    count: number;
}
interface PlayerDraft {
    playerId: string;
    moves: MoveDraft[];
}
interface TeamDraft {
    teamMembers: PlayerDraft[];
}

interface MatchDraftStore {
    redTeam: TeamDraft;
    blueTeam: TeamDraft;
    actions: {
        clear: () => void;
        getPlayers: () => (PlayerDraft & { team: TeamId })[];

        setPlayerTeam: (playerId: string, team: TeamId) => void;
        setMoveCount: (userId: string, moveId: string, count: number) => void;
    };
}

export const useMatchDraftStore = create<MatchDraftStore>()((set, get) => ({
    redTeam: {
        teamMembers: [],
    },
    blueTeam: {
        teamMembers: [],
    },

    actions: {
        clear: () => {
            set(() => ({
                redTeam: {
                    teamMembers: [],
                },
                blueTeam: {
                    teamMembers: [],
                },
            }));
        },
        getPlayers: () => {
            const bluePlayers = get().blueTeam.teamMembers.map((i) => ({
                ...i,
                team: 'blue' as const,
            }));
            const redPlayers = get().redTeam.teamMembers.map((i) => ({
                ...i,
                team: 'red' as const,
            }));
            return [...bluePlayers, ...redPlayers];
        },

        setPlayerTeam: async (playerId, team) => {
            set((state) => {
                const { redTeam, blueTeam } = state;

                // Remove the player from both teams
                const updatedRedTeam = redTeam.teamMembers.filter(
                    (i) => i.playerId !== playerId
                );
                const updatedBlueTeam = blueTeam.teamMembers.filter(
                    (i) => i.playerId !== playerId
                );

                // Add the player to the new team, if specified
                if (team === 'red') {
                    updatedRedTeam.push({ playerId: playerId, moves: [] });
                } else if (team === 'blue') {
                    updatedBlueTeam.push({ playerId: playerId, moves: [] });
                }

                return {
                    redTeam: { teamMembers: updatedRedTeam },
                    blueTeam: { teamMembers: updatedBlueTeam },
                };
            });
        },
        setMoveCount: (userId, moveId, count) => {
            set((state) => {
                const updateTeam = (team: TeamDraft) => ({
                    teamMembers: team.teamMembers.map((player) => {
                        if (player.playerId !== userId) return player;

                        if (
                            !player.moves.find((move) => move.moveId === moveId)
                        ) {
                            player.moves.push({ moveId, count });
                        }

                        const moves = player.moves.map((move) =>
                            move.moveId === moveId ? { ...move, count } : move
                        );

                        return {
                            ...player,
                            moves,
                        };
                    }),
                });

                return {
                    redTeam: updateTeam(state.redTeam),
                    blueTeam: updateTeam(state.blueTeam),
                };
            });
        },
    },
}));
