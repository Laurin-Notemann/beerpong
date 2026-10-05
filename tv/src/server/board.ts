import type { DisplayConfig } from '~/lib/display';
import { type CupPosition, foldLiveMatch } from '~/lib/liveMatch';
import { type RankingAlgorithm, rankingNames, rankPlayers } from '~/lib/ranking';
import type * as Dto from '@/openapi/openapi';

import { apiFor, assetUrl } from '~/server/api';

export interface BoardPlayer {
    id: string;
    name: string;
    avatarUrl: string | null;
}

export interface LeaderboardRow extends BoardPlayer {
    rank: number;
    tied: boolean;
    /** the ranking's value as shown, e.g. "1204" Elo or "3.4" average points */
    value: string;
    matches: number;
    wins: number;
    /** fewer matches than the season needs to be ranked */
    unranked: boolean;
}

export interface LiveTeam {
    players: BoardPlayer[];
    score: number;
    standing: CupPosition[];
}

export interface LiveMatchView {
    id: string;
    startedAt: string;
    lastActivityAt: string;
    blue: LiveTeam;
    red: LiveTeam;
}

/** everything a TV (and the phone controlling it) shows, in one request */
export interface Board {
    group: { id: string; name: string };
    seasons: { id: string; name: string; active: boolean }[];
    season: { id: string; name: string } | null;
    ranking: string;
    leaderboard: { rows: LeaderboardRow[]; numMatches: number; numPlayers: number };
    /** every live match of the group, most recently active first */
    liveMatches: LiveMatchView[];
}

export async function buildBoard(refreshToken: string, config: DisplayConfig): Promise<Board> {
    const groupId = config.groupId!;
    const api = apiFor(refreshToken);

    const [group, seasons, profiles, live] = await Promise.all([
        api.group(groupId),
        api.seasons(groupId),
        api.profiles(groupId),
        api.liveMatches(groupId),
    ]);
    const season =
        seasons.find((i) => i.id === config.seasonId) ??
        seasons.find((i) => i.id === group.activeSeasonId) ??
        null;

    const avatars = new Map(
        await Promise.all(
            profiles.map(async (i) => [i.id!, await assetUrl(i.assetIdAvatar)] as const)
        )
    );
    const profile = (profileId: string | undefined): BoardPlayer => {
        const p = profiles.find((i) => i.id === profileId);
        return {
            id: profileId ?? '',
            name: p?.name ?? 'Unknown',
            avatarUrl: avatars.get(profileId ?? '') ?? null,
        };
    };

    // live matches can be in another season than the leaderboard's (an old one still running)
    const seasonData = new Map<string, Promise<[Dto.PlayerDto[], Dto.RuleMoveDto[]]>>();
    const dataOf = (seasonId: string) => {
        if (!seasonData.has(seasonId)) {
            seasonData.set(
                seasonId,
                Promise.all([api.players(groupId, seasonId), api.ruleMoves(groupId, seasonId)])
            );
        }
        return seasonData.get(seasonId)!;
    };

    const [board, liveMatches] = await Promise.all([
        api.leaderboard(groupId, config.scope, season?.id ?? null),
        Promise.all(
            live
                .filter((i) => i.id && i.seasonId)
                .sort((a, b) =>
                    (b.lastActivityAt ?? b.startedAt ?? '').localeCompare(
                        a.lastActivityAt ?? a.startedAt ?? ''
                    )
                )
                .map(async (dto): Promise<LiveMatchView> => {
                    const [players, moves] = await dataOf(dto.seasonId!);
                    const { blue, red } = foldLiveMatch(dto, moves);
                    const team = (t: typeof blue): LiveTeam => ({
                        ...t,
                        players: t.playerIds.map((id) => ({
                            ...profile(players.find((p) => p.id === id)?.profileId),
                            id,
                        })),
                    });
                    return {
                        id: dto.id!,
                        startedAt: dto.startedAt ?? '',
                        lastActivityAt: dto.lastActivityAt ?? dto.startedAt ?? '',
                        blue: team(blue),
                        red: team(red),
                    };
                })
        ),
    ]);

    const algo: RankingAlgorithm = season?.seasonSettings?.rankingAlgorithm ?? 'ELO';
    const minMatches = season?.seasonSettings?.minMatchesToQualify ?? 0;
    const entries = (board.entries ?? []).map((i) => ({
        ...profile(i.profileId),
        id: i.id ?? '',
        elo: i.statistics?.elo ?? 0,
        points: i.statistics?.points ?? 0,
        matches: i.statistics?.matches ?? 0,
        wins: i.statistics?.wins ?? 0,
    }));
    const ranked = rankPlayers(
        entries.filter((i) => i.matches >= minMatches),
        algo
    );
    const unranked = rankPlayers(
        entries.filter((i) => i.matches < minMatches && i.matches > 0),
        algo
    );

    return {
        group: { id: groupId, name: group.name ?? '' },
        seasons: seasons.map((i) => ({
            id: i.id!,
            name: i.name || 'Current season',
            active: i.id === group.activeSeasonId,
        })),
        season: season ? { id: season.id!, name: season.name || 'Current season' } : null,
        ranking: rankingNames[algo],
        leaderboard: {
            rows: [
                ...ranked.map((i) => ({
                    ...i.player,
                    rank: i.rank,
                    tied: i.tied,
                    value: i.value,
                    unranked: false,
                })),
                ...unranked.map((i) => ({
                    ...i.player,
                    rank: i.rank,
                    tied: i.tied,
                    value: i.value,
                    unranked: true,
                })),
            ],
            numMatches: board.numMatches ?? 0,
            numPlayers: board.numPlayers ?? 0,
        },
        liveMatches,
    };
}
