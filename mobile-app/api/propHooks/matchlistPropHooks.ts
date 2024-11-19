import { MatchesListProps } from '@/components/MatchesList';

import { useMatchesQuery } from '../calls/matchHooks';
import { usePlayersQuery } from '../calls/playerHooks';
import { useGroup } from '../calls/seasonHooks';
import { ScreenState } from '../types';

export const useMatchlistProps = (): ScreenState<MatchesListProps> => {
    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { data, ...screenState } = useMatchesQuery(groupId, seasonId);

    const props: MatchesListProps | null = data?.data
        ? {
              matches:
                  data.data.map((i) => {
                      const [blueTeam, redTeam] = i.teams ?? [];

                      const profiles = playersQuery.data?.data ?? [];

                      const bluePlayers = i
                          .teamMembers!.filter((i) => i.teamId === blueTeam.id)
                          .map((i) => ({
                              ...i,
                              ...(profiles.find((j) => j.id === i.playerId!)
                                  ?.profile ?? {}),
                          }));
                      const redPlayers = i
                          .teamMembers!.filter((i) => i.teamId === redTeam.id)
                          .map((i) => ({
                              ...i,
                              ...(profiles.find((j) => j.id === i.playerId!)
                                  ?.profile ?? {}),
                          }));

                      const blueCups = i
                          .matchMoves!.filter((j) => {
                              const player = i.teamMembers!.find(
                                  (k) => j.teamMemberId === k.id
                              );
                              return player?.teamId === blueTeam.id;
                          })
                          // value is the amount of times the move has been performed by the player
                          .reduce((sum, j) => sum + j.value!, 0);

                      const redCups = i
                          .matchMoves!.filter((j) => {
                              const player = i.teamMembers!.find(
                                  (k) => j.teamMemberId === k.id
                              );
                              return player?.teamId === redTeam.id;
                          })
                          // value is the amount of times the move has been performed by the player
                          .reduce((sum, j) => sum + j.value!, 0);

                      return {
                          blueCups,
                          redCups,
                          date: new Date(i.date!),
                          redTeam: redPlayers.map((i) => ({
                              name: i.name!,
                              avatarUrl: i.avatarAsset?.url,
                          })),
                          blueTeam: bluePlayers.map((i) => ({
                              name: i.name!,
                              avatarUrl: i.avatarAsset?.url,
                          })),
                      };
                  }) ?? [],
          }
        : null;

    return {
        props,
        ...screenState,
    };
};
