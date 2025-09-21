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
export interface PlayerDraft {
    playerId: string;
    moves: MoveDraft[];
}
interface TeamDraft {
    teamMembers: PlayerDraft[];
}

interface MatchEditDraftStore {
    blueTeamPhotoUri?: string;
    redTeamPhotoUri?: string;
    // whether there are changes to be saved
    isDirty: boolean;
    // the original state before editing, used to determine isDirty
    _baseline: {
        redTeam: TeamDraft;
        blueTeam: TeamDraft;
    } | null;
    redTeam: TeamDraft;
    blueTeam: TeamDraft;
    actions: {
        clear: () => void;
        getPlayers: () => (PlayerDraft & { team: TeamId })[]; // TODO: why is getPlayers an action? document this?

        setPlayerTeam: (playerId: string, team: TeamId) => void;
        setMoveCount: (userId: string, moveId: string, count: number) => void;
        setMatch: (match: Match) => void;
        setTeamPhotos: (photos: {
            blueTeamPhotoUri?: string;
            redTeamPhotoUri?: string;
        }) => void;
        removeTeamPhotos: () => void;
        swapTeamPhotos: () => void;
    };
}

const isEqual = (a: TeamDraft, b: TeamDraft): boolean =>
    JSON.stringify(a) === JSON.stringify(b);

export const useMatchEditDraftStore = create<MatchEditDraftStore>()(
    (set, get) => ({
        isDirty: false,
        _baseline: null,
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
                    isDirty: true,
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

            setPlayerTeam: (playerId, team) => {
                set((state) => {
                    const { redTeam, blueTeam, _baseline: baseline } = state;

                    // Remove the player from both teams
                    const updatedRedTeam = redTeam.teamMembers.filter(
                        (i) => i.playerId !== playerId
                    );
                    const updatedBlueTeam = blueTeam.teamMembers.filter(
                        (i) => i.playerId !== playerId
                    );

                    // Add the player to the new team, if specified
                    if (team === 'red') {
                        updatedRedTeam.push({ playerId, moves: [] });
                    } else if (team === 'blue') {
                        updatedBlueTeam.push({ playerId, moves: [] });
                    }

                    const newRed = { teamMembers: updatedRedTeam };
                    const newBlue = { teamMembers: updatedBlueTeam };

                    return {
                        redTeam: newRed,
                        blueTeam: newBlue,
                        isDirty:
                            !baseline ||
                            !isEqual(baseline.redTeam, newRed) ||
                            !isEqual(baseline.blueTeam, newBlue),
                    };
                });
            },
            setMoveCount: (userId, moveId, count) => {
                set((state) => {
                    const updateTeam = (team: TeamDraft) => ({
                        teamMembers: team.teamMembers.map((player) => {
                            if (player.playerId !== userId) return player;

                            const existing = player.moves.find(
                                (m) => m.moveId === moveId
                            );
                            if (!existing) {
                                return {
                                    ...player,
                                    moves: [...player.moves, { moveId, count }],
                                };
                            }

                            const updatedMoves = player.moves.map((move) =>
                                move.moveId === moveId
                                    ? { ...move, count }
                                    : move
                            );
                            return { ...player, moves: updatedMoves };
                        }),
                    });

                    const newRed = updateTeam(state.redTeam);
                    const newBlue = updateTeam(state.blueTeam);
                    const { _baseline: baseline } = state;

                    return {
                        redTeam: newRed,
                        blueTeam: newBlue,
                        isDirty:
                            !baseline ||
                            !isEqual(baseline.redTeam, newRed) ||
                            !isEqual(baseline.blueTeam, newBlue),
                    };
                });
            },
            setMatch: (match) => {
                const redTeam = {
                    teamMembers: match.redTeam.map((i) => ({
                        playerId: i.id,
                        moves: i.moves.map((m) => ({
                            moveId: m.id,
                            count: m.count,
                        })),
                    })),
                };
                const blueTeam = {
                    teamMembers: match.blueTeam.map((i) => ({
                        playerId: i.id,
                        moves: i.moves.map((m) => ({
                            moveId: m.id,
                            count: m.count,
                        })),
                    })),
                };

                set(() => ({
                    redTeam,
                    blueTeam,
                    _baseline: {
                        redTeam,
                        blueTeam,
                    },
                    isDirty: false,
                }));
            },
            setTeamPhotos: ({ blueTeamPhotoUri, redTeamPhotoUri }) => {
                set(() => ({
                    blueTeamPhotoUri: blueTeamPhotoUri,
                    redTeamPhotoUri: redTeamPhotoUri,
                }));
            },
            removeTeamPhotos: () => {
                set(() => ({
                    blueTeamPhotoUri: undefined,
                    redTeamPhotoUri: undefined,
                }));
            },
            swapTeamPhotos: () => {
                set((state) => ({
                    blueTeamPhotoUri: state.redTeamPhotoUri,
                    redTeamPhotoUri: state.blueTeamPhotoUri,
                }));
            },
        },
    })
);
