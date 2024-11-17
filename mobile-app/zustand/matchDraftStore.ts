import { create } from 'zustand';

import { TeamId } from '@/components/screens/NewMatchAssignTeams';

interface MatchDraftStore {
    redTeam: {
        players: { id: string; moves: { id: string; count: number }[] }[];
    };
    blueTeam: {
        players: { id: string; moves: { id: string; count: number }[] }[];
    };
    actions: {
        clear: () => void;
        getPlayers: () => {
            id: string;
            team: TeamId;
            moves: { id: string; count: number }[];
        }[];

        setPlayerTeam: (playerId: string, team: TeamId) => void;
        setMoveCount: (userId: string, moveId: string, count: number) => void;
    };
}

export const useMatchDraftStore = create<MatchDraftStore>()((set, get) => ({
    redTeam: {
        players: [],
    },
    blueTeam: {
        players: [],
    },

    actions: {
        clear: () => {
            set(() => ({
                redTeam: {
                    players: [],
                },
                blueTeam: {
                    players: [],
                },
            }));
        },
        getPlayers: () => {
            const bluePlayers = get().blueTeam.players.map((i) => ({
                ...i,
                team: 'blue' as const,
            }));
            const redPlayers = get().redTeam.players.map((i) => ({
                ...i,
                team: 'red' as const,
            }));
            return [...bluePlayers, ...redPlayers];
        },

        setPlayerTeam: async (playerId, team) => {
            set((state) => {
                const { redTeam, blueTeam } = state;

                // Remove the player from both teams
                const updatedRedTeam = redTeam.players.filter(
                    (i) => i.id !== playerId
                );
                const updatedBlueTeam = blueTeam.players.filter(
                    (i) => i.id !== playerId
                );

                // Add the player to the new team, if specified
                if (team === 'red') {
                    updatedRedTeam.push({ id: playerId, moves: [] });
                } else if (team === 'blue') {
                    updatedBlueTeam.push({ id: playerId, moves: [] });
                }

                return {
                    redTeam: { players: updatedRedTeam },
                    blueTeam: { players: updatedBlueTeam },
                };
            });
        },
        setMoveCount: (userId, moveId, count) => {
            set((state) => {
                const updateTeam = (team: typeof state.redTeam) => ({
                    players: team.players.map((player) =>
                        player.id === userId
                            ? {
                                  ...player,
                                  moves: player.moves.map((move) =>
                                      move.id === moveId
                                          ? { ...move, count: count }
                                          : move
                                  ),
                              }
                            : player
                    ),
                });

                return {
                    redTeam: updateTeam(state.redTeam),
                    blueTeam: updateTeam(state.blueTeam),
                };
            });
        },
    },
}));
