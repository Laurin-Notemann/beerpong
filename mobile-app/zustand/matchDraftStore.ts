import { create } from 'zustand';

import { TeamId } from '@/components/screens/NewMatchAssignTeams';
import {
    CupHit,
    CupPosition,
    CupTeam,
    findHit,
    reconcileHits,
} from '@/lib/cupHits';

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

type Teams = Pick<MatchDraftStore, 'redTeam' | 'blueTeam'>;

/** sets one move count of a player (at least 0), wherever they play */
function updateMoves(
    teams: Teams,
    playerId: string,
    moveId: string,
    update: (count: number) => number
): Teams {
    const updateTeam = (team: TeamDraft): TeamDraft => ({
        teamMembers: team.teamMembers.map((player) => {
            if (player.playerId !== playerId) return player;

            const current =
                player.moves.find((i) => i.moveId === moveId)?.count ?? 0;
            const count = Math.max(0, update(current));

            return {
                ...player,
                moves: player.moves.some((i) => i.moveId === moveId)
                    ? player.moves.map((i) =>
                          i.moveId === moveId ? { ...i, count } : i
                      )
                    : [...player.moves, { moveId, count }],
            };
        }),
    });
    return {
        redTeam: updateTeam(teams.redTeam),
        blueTeam: updateTeam(teams.blueTeam),
    };
}

/** keeps the cup hits in line with the teams and move counts they're paired with */
function withHits(
    state: Teams & Pick<MatchDraftStore, 'cupHits'>
): Teams & Pick<MatchDraftStore, 'cupHits'> {
    const { hits, takenBackFinishes } = reconcileHits(state.cupHits, [
        ...state.redTeam.teamMembers.map((i) => ({
            ...i,
            team: 'red' as const,
        })),
        ...state.blueTeam.teamMembers.map((i) => ({
            ...i,
            team: 'blue' as const,
        })),
    ]);
    const teams = takenBackFinishes.reduce<Teams>(
        (acc, finish) =>
            updateMoves(acc, finish.playerId, finish.moveId, (n) => n - 1),
        state
    );
    return { redTeam: teams.redTeam, blueTeam: teams.blueTeam, cupHits: hits };
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
