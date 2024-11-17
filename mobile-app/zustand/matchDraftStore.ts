import { create } from 'zustand';

interface MatchDraftStore {
    redTeam: {
        players: string[];
    };
    blueTeam: {
        players: string[];
    };
    actions: {
        setPlayerTeam: (playerId: string, team: 'blue' | 'red' | null) => void;
        clear: () => void;
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
        setPlayerTeam: async (
            playerId: string,
            team: 'blue' | 'red' | null
        ) => {
            set((state) => {
                const { redTeam, blueTeam } = state;

                // Remove the player from both teams
                const updatedRedTeam = redTeam.players.filter(
                    (id) => id !== playerId
                );
                const updatedBlueTeam = blueTeam.players.filter(
                    (id) => id !== playerId
                );

                // Add the player to the new team, if specified
                if (team === 'red') {
                    updatedRedTeam.push(playerId);
                } else if (team === 'blue') {
                    updatedBlueTeam.push(playerId);
                }

                return {
                    redTeam: { players: updatedRedTeam },
                    blueTeam: { players: updatedBlueTeam },
                };
            });
        },
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
    },
}));
