// A running live match is a log of ops that only clients interpret. It's reduced here with the
// app's own code, like on the TV, so the simulator counts the same teams and moves the phones
// show. Keep the imported modules free of React Native imports.
import { toTeamCreateDtos } from '@/lib/liveMatch/log';
import { reduceLiveMatch } from '@/lib/liveMatch/reducer';
import { toLiveOps } from '@/lib/liveMatch/types';
import type * as Dto from '@/openapi/openapi';

export type LiveMatchDto = Dto.LiveMatchDto;

/** the live match's teams as a match would be entered right now; null while a team is empty */
export function liveTeams(dto: LiveMatchDto) {
    const teams = toTeamCreateDtos(reduceLiveMatch(toLiveOps(dto.ops)).state);
    return teams.every((t) => t.teamMembers?.length) ? teams : null;
}
