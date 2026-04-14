import { create } from 'zustand';

import { Formation, FormationType } from '@/components/CupGrid/Formation';
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
    savePhoto: boolean;
    cups: CupsState;
}

interface CupsState {
    initialFormation: FormationType;
    currentFormation: {
        rows: number;
        columns: number;
        cups: {
            x: number;
            y: number;
            hitby?: string; // matchmove
        }[];
    };
}

interface MatchDraftStore {
    blueTeamPhotoUri?: string;
    redTeamPhotoUri?: string;
    hasBeenOnPageTwo: boolean;
    redTeam: TeamDraft;
    blueTeam: TeamDraft;
    actions: {
        getHasBeenOnPageTwo: () => boolean;
        setHasBeenOnPageTwo: () => void;
        clear: () => void;
        getPlayers: () => (PlayerDraft & { team: TeamId })[];

        setPlayerTeam: (playerId: string, team: TeamId) => void;
        setMoveCount: (userId: string, moveId: string, count: number) => void;
        setCupHit: (
            cup: { x: number; y: number },
            playerId: string,
            moveId: string
        ) => void;
        setTeams: (
            redTeam: { id: string }[],
            blueTeam: { id: string }[]
        ) => void;
        setTeamPhotos: (photos: {
            blueTeamPhotoUri?: string;
            redTeamPhotoUri?: string;
        }) => void;
        removeTeamPhotos: () => void;
        swapTeamPhotos: () => void;
    };
}

export const useMatchDraftStore = create<MatchDraftStore>()((set, get) => ({
    hasBeenOnPageTwo: false,
    redTeam: {
        teamMembers: [],

        cups: {
            initialFormation: Formation.Pyramid_10,
            currentFormation: Formation.Pyramid_10,
        },
        savePhoto: false
    },
    blueTeam: {
        teamMembers: [],

        cups: {
            initialFormation: Formation.Pyramid_10,
            currentFormation: Formation.Pyramid_10,
        },
        savePhoto: false
    },

    actions: {
        getHasBeenOnPageTwo: () => {
            return get().hasBeenOnPageTwo;
        },
        setHasBeenOnPageTwo: () => {
            set(() => ({
                hasBeenOnPageTwo: true,
            }));
        },
        clear: () => {
            set(() => ({
                hasBeenOnPageTwo: false,
                redTeam: {
                    teamMembers: [],
                    cups: {
                        initialFormation: Formation.Pyramid_10,
                        currentFormation: Formation.Pyramid_10,
                    },
                    savePhoto: false
                },
                blueTeam: {
                    teamMembers: [],
                    cups: {
                        initialFormation: Formation.Pyramid_10,
                        currentFormation: Formation.Pyramid_10,
                    },
                    savePhoto: false
                },
                blueTeamPhotoUri: undefined,
                redTeamPhotoUri: undefined,
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
                    redTeam: {
                        teamMembers: updatedRedTeam,
                        cups: redTeam.cups,
                        savePhoto: redTeam.savePhoto
                    },
                    blueTeam: {
                        teamMembers: updatedBlueTeam,
                        cups: blueTeam.cups,
                        savePhoto: blueTeam.savePhoto
                    },
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
                    cups: team.cups,
                    savePhoto: team.savePhoto
                });

                return {
                    redTeam: updateTeam(state.redTeam),
                    blueTeam: updateTeam(state.blueTeam),
                };
            });
        },
        setCupHit: (cup, playerId, moveId) => {
            set((state) => {
                const updateTeam = (team: TeamDraft) => ({
                    teamMembers: team.teamMembers.map((player) => {
                        if (player.playerId !== playerId) return player;

                        const moves = player.moves.map((move) =>
                            move.moveId === moveId
                                ? { ...move, count: move.count + 1 }
                                : move
                        );

                        return {
                            ...player,
                            moves,
                        };
                    }),
                    cups: {
                        ...team.cups,
                        currentFormation: team.teamMembers.some(
                            (p) => p.playerId === playerId
                        )
                            ? team.cups.currentFormation
                            : {
                                  ...team.cups.currentFormation,
                                  cups: team.cups.currentFormation.cups.map(
                                      (i) =>
                                          i.x === cup.x && i.y === cup.y
                                              ? { ...i, hitby: playerId }
                                              : i
                                  ),
                              },
                    },
                    savePhoto: team.savePhoto
                });

                return {
                    redTeam: updateTeam(state.redTeam),
                    blueTeam: updateTeam(state.blueTeam),
                };
            });
        },
        setTeams: (redTeam, blueTeam) => {
            set(() => ({
                redTeam: {
                    teamMembers: redTeam.map((i) => ({
                        playerId: i.id,
                        moves: [],
                    })),
                    cups: {
                        initialFormation: Formation.Pyramid_10,
                        currentFormation: Formation.Pyramid_10,
                    },
                    //TODO check thjis
                    savePhoto: false
                },
                blueTeam: {
                    teamMembers: blueTeam.map((i) => ({
                        playerId: i.id,
                        moves: [],
                    })),
                    cups: {
                        initialFormation: Formation.Pyramid_10,
                        currentFormation: Formation.Pyramid_10,
                    },
                    //TODO check this
                    savePhoto: false
                },
            }));
        },
        setTeamPhotos: ({ blueTeamPhotoUri, redTeamPhotoUri }) => {
            set((state) => {
                const updateTeam = (team: TeamDraft) => ({
                    teamMembers: team.teamMembers,
                    cups: team.cups,
                    savePhoto: true
                });

                return {
                    blueTeamPhotoUri,
                    redTeamPhotoUri,
                    redTeam: updateTeam(state.redTeam),
                    blueTeam: updateTeam(state.blueTeam),
                };
            });
        },
        removeTeamPhotos: () => {
            set((state) => {
                const updateTeam = (team: TeamDraft) => ({
                    teamMembers: team.teamMembers,
                    cups: team.cups,
                    savePhoto: false
                });

                return {
                    blueTeamPhotoUri: undefined,
                    redTeamPhotoUri: undefined,
                    redTeam: updateTeam(state.redTeam),
                    blueTeam: updateTeam(state.blueTeam),
                };
            });
        },
        swapTeamPhotos: () => {
            set((state) => ({
                blueTeamPhotoUri: state.redTeamPhotoUri,
                redTeamPhotoUri: state.blueTeamPhotoUri,
            }));
        },
    },
}));
