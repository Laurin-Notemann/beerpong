import { create } from 'zustand';

import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import {
    CupHit,
    CupPosition,
    CupTeam,
    findHit,
    PlayerDraft,
    TeamDraft,
    updateMoves,
    withHits,
} from '@/lib/cupHits';

interface MatchDraftStore {
    blueTeamPhotoUri?: string;
    redTeamPhotoUri?: string;
    hasBeenOnPageTwo: boolean;
    redTeam: TeamDraft;
    blueTeam: TeamDraft;
    /** pro mode: the hits entered on the cups page, oldest first */
    cupHits: CupHit[];
    actions: {
        getHasBeenOnPageTwo: () => boolean;
        setHasBeenOnPageTwo: () => void;
        clear: () => void;

        setPlayerTeam: (playerId: string, team: TeamId) => void;
        setMoveCount: (userId: string, moveId: string, count: number) => void;
        /** counts the hit's move (and finish) for its scorer and takes its cups off the table */
        recordCupHit: (hit: CupHit) => void;
        /** the reverse of recordCupHit for the hit that took this cup */
        undoCupHit: (team: CupTeam, cup: CupPosition) => void;
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
    redTeam: { teamMembers: [] },
    blueTeam: { teamMembers: [] },
    cupHits: [],

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
                redTeam: { teamMembers: [] },
                blueTeam: { teamMembers: [] },
                cupHits: [],
                blueTeamPhotoUri: undefined,
                redTeamPhotoUri: undefined,
            }));
        },
        setPlayerTeam: (playerId, team) => {
            set((state) => {
                // a player who changes teams starts over with no moves
                const without = (members: PlayerDraft[]) =>
                    members.filter((i) => i.playerId !== playerId);
                const added = { playerId, moves: [] };

                return withHits({
                    redTeam: {
                        teamMembers:
                            team === 'red'
                                ? [...without(state.redTeam.teamMembers), added]
                                : without(state.redTeam.teamMembers),
                    },
                    blueTeam: {
                        teamMembers:
                            team === 'blue'
                                ? [
                                      ...without(state.blueTeam.teamMembers),
                                      added,
                                  ]
                                : without(state.blueTeam.teamMembers),
                    },
                    cupHits: state.cupHits,
                });
            });
        },
        setMoveCount: (userId, moveId, count) => {
            set((state) =>
                withHits({
                    ...updateMoves(state, userId, moveId, () => count),
                    cupHits: state.cupHits,
                })
            );
        },
        recordCupHit: (hit) => {
            set((state) => {
                let teams = updateMoves(
                    state,
                    hit.playerId,
                    hit.moveId,
                    (count) => count + 1
                );
                if (hit.finishMoveId) {
                    teams = updateMoves(
                        teams,
                        hit.playerId,
                        hit.finishMoveId,
                        (count) => count + 1
                    );
                }
                return withHits({
                    ...teams,
                    cupHits: [...state.cupHits, hit],
                });
            });
        },
        undoCupHit: (team, cup) => {
            set((state) => {
                const hit = findHit(state.cupHits, team, cup);

                if (!hit) return state;

                let teams = updateMoves(
                    state,
                    hit.playerId,
                    hit.moveId,
                    (count) => count - 1
                );
                if (hit.finishMoveId) {
                    teams = updateMoves(
                        teams,
                        hit.playerId,
                        hit.finishMoveId,
                        (count) => count - 1
                    );
                }
                return withHits({
                    ...teams,
                    cupHits: state.cupHits.filter((i) => i !== hit),
                });
            });
        },
        setTeams: (redTeam, blueTeam) => {
            set(() => ({
                redTeam: {
                    teamMembers: redTeam.map((i) => ({
                        playerId: i.id,
                        moves: [],
                    })),
                },
                blueTeam: {
                    teamMembers: blueTeam.map((i) => ({
                        playerId: i.id,
                        moves: [],
                    })),
                },
                cupHits: [],
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
}));
