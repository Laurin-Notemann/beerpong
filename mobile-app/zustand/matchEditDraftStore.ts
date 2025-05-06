/**
 * this is copy-pasted from matchDraftStore
 * TODO: we do want a seperate store for this, but refactor these to reduce code duplication
 */
import { create } from 'zustand';

import { Match } from '@/api/utils/matchDtoToMatch';
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

interface MatchEditDraftStore {
    isDirty: boolean;
    redTeam: TeamDraft;
    blueTeam: TeamDraft;
    actions: {
        clear: () => void;
        getPlayers: () => (PlayerDraft & { team: TeamId })[]; // TODO: why is getPlayers an action? document this?

        setPlayerTeam: (playerId: string, team: TeamId) => void;
        setMoveCount: (userId: string, moveId: string, count: number) => void;
        setMatch: (match: Match) => void;
    };
}

export const useMatchEditDraftStore = create<MatchEditDraftStore>()(
    (set, get) => ({
        isDirty: true, // TODO: implement this
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
                                !player.moves.find(
                                    (move) => move.moveId === moveId
                                )
                            ) {
                                player.moves.push({ moveId, count });
                            }

                            const moves = player.moves.map((move) =>
                                move.moveId === moveId
                                    ? { ...move, count }
                                    : move
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
            setMatch: (match) => {
                set(() => ({
                    redTeam: {
                        teamMembers: match.redTeam.map((i) => ({
                            playerId: i.id,
                            moves: i.moves.map((move) => ({
                                moveId: move.id,
                                count: move.count,
                            })),
                        })),
                    },
                    blueTeam: {
                        teamMembers: match.blueTeam.map((i) => ({
                            playerId: i.id,
                            moves: i.moves.map((move) => ({
                                moveId: move.id,
                                count: move.count,
                            })),
                        })),
                    },
                }));
            },
        },
    })
);
