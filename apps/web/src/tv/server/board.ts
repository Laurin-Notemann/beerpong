import type { DisplayConfig } from '@/lib/tvDisplay';
import { foldLiveMatch, type RackCup } from '~/tv/lib/liveMatch';
import { type RankingAlgorithm, rankingNames, rankPlayers } from '~/tv/lib/ranking';
import type * as Dto from '@/openapi/openapi';

import { apiFor, assetUrl } from '~/tv/server/api';
import { clipPath } from '~/tv/server/clips';

export interface BoardPlayer {
    id: string;
    name: string;
    avatarUrl: string | null;
    /** the clips the TV plays one of when they score in a live match, on this server (clips.ts) */
    scoreClipUrls: string[];
}

/** what a player's live match does to their standing, if it ended now */
export interface PlayerChange {
    points: number;
    elo: number;
    /** places gained (negative: lost) */
    rank: number;
    /** their rank and Elo with the change */
    newRank: number;
    newElo: number;
}

export interface LeaderboardRow extends BoardPlayer {
    rank: number;
    tied: boolean;
    /** the ranking's value as shown, e.g. "1204" Elo or "3.4" average points */
    value: string;
    elo: number;
    points: number;
    matches: number;
    wins: number;
    /** fewer matches than the season needs to be ranked */
    unranked: boolean;
    /** set while the player is in a live match */
    change: PlayerChange | null;
}

export interface LiveTeam {
    players: (BoardPlayer & {
        change: PlayerChange | null;
        /** points earned in this match, independent of the leaderboard scope */
        points: number;
        standing: Pick<LeaderboardRow, 'rank' | 'tied' | 'unranked'> | null;
    })[];
    score: number;
    cups: RackCup[];
}

export interface LiveMatchView {
    id: string;
    startedAt: string;
    lastActivityAt: string;
    blue: LiveTeam;
    red: LiveTeam;
    /** the cup hits so far, newest first, with the score right after each */
    moves: {
        name: string;
        avatarUrl: string | null;
        team: 'blue' | 'red';
        move: string;
        blue: number;
        red: number;
    }[];
}

/** everything a TV (and the phone controlling it) shows, in one request */
export interface Board {
    group: { id: string; name: string };
    seasons: { id: string; name: string; active: boolean }[];
    season: { id: string; name: string } | null;
    ranking: string;
    /**
     * Live matches count as if they ended now (the leading team wins, a tie is a draw), so the
     * table moves while they play. `change` says by how much, against the stored standings.
     */
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
    const profile = (profileId: string | null | undefined): BoardPlayer => {
        const p = profiles.find((i) => i.id === profileId);
        return {
            id: profileId ?? '',
            name: p?.name ?? 'Unknown',
            avatarUrl: avatars.get(profileId ?? '') ?? null,
            // an API from before several clips only has the one
            scoreClipUrls: (p?.scoreClipUrls ?? [p?.scoreClipUrl])
                .map(clipPath)
                .filter((i) => i !== null),
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

    const folded = await Promise.all(
        live
            .filter((i) => i.id && i.seasonId)
            .sort((a, b) =>
                (b.lastActivityAt ?? b.startedAt ?? '').localeCompare(
                    a.lastActivityAt ?? a.startedAt ?? ''
                )
            )
            .map(async (dto) => {
                const [players, moves] = await dataOf(dto.seasonId!);
                return { dto, players, ...foldLiveMatch(dto, moves) };
            })
    );

    // the live matches this board counts: those of its season (the running one for today and
    // all time) with players on both sides
    const boardSeasonId = config.scope === 'season' ? season?.id : group.activeSeasonId;
    const projected = folded.filter(
        (i) => i.dto.seasonId === boardSeasonId && i.blue.playerIds.length && i.red.playerIds.length
    );

    const [stored, withLive] = await Promise.all([
        api.leaderboard(groupId, config.scope, season?.id ?? null),
        projected.length
            ? api
                  .projection(
                      groupId,
                      config.scope,
                      season?.id ?? null,
                      projected.map((i) => ({ teams: i.teams }))
                  )
                  // an API without projections: the stored standings
                  .catch(() => null)
            : null,
    ]);

    const algo: RankingAlgorithm = season?.seasonSettings?.rankingAlgorithm ?? 'ELO';
    const minMatches = season?.seasonSettings?.minMatchesToQualify ?? 0;
    const rank = (board: Dto.LeaderboardDto) => {
        const entries = (board.entries ?? []).map((i) => ({
            ...profile(i.profileId),
            id: i.id ?? '',
            profileId: i.profileId ?? '',
            elo: i.statistics?.elo ?? 0,
            points: i.statistics?.points ?? 0,
            matches: i.statistics?.matches ?? 0,
            wins: i.statistics?.wins ?? 0,
        }));
        const ranked = rankPlayers(
            entries.filter((i) => i.matches >= minMatches),
            algo
        ).map((i) => ({
            ...i.player,
            rank: i.rank,
            tied: i.tied,
            value: i.value,
            unranked: false,
        }));
        const unranked = rankPlayers(
            entries.filter((i) => i.matches < minMatches && i.matches > 0),
            algo
        ).map((i) => ({ ...i.player, rank: i.rank, tied: i.tied, value: i.value, unranked: true }));
        return [...ranked, ...unranked];
    };

    const before = new Map(rank(stored).map((i) => [i.id, i]));
    const playing = new Set(projected.flatMap((i) => [...i.blue.playerIds, ...i.red.playerIds]));
    const ranked = rank(withLive ?? stored);
    const rows: LeaderboardRow[] = ranked.map((row) => {
        const old = before.get(row.id);
        const change: PlayerChange | null =
            withLive && playing.has(row.id)
                ? {
                      points: row.points - (old?.points ?? 0),
                      // a player's first match starts them at the API's 1500
                      elo: row.elo - (old?.elo ?? 1500),
                      rank: old && !old.unranked && !row.unranked ? old.rank - row.rank : 0,
                      newRank: row.rank,
                      newElo: row.elo,
                  }
                : null;
        return { ...row, change };
    });
    const standingOf = (playerId: string, profileId: string | null | undefined) => {
        const entry = ranked.find((i) => i.id === playerId || i.profileId === profileId);
        return rows.find((i) => i.id === entry?.id) ?? null;
    };

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
            rows,
            numMatches: stored.numMatches ?? 0,
            numPlayers: stored.numPlayers ?? 0,
        },
        liveMatches: folded.map(({ dto, players, blue, red, moves }) => {
            const team = (t: typeof blue): LiveTeam => ({
                score: t.score,
                cups: t.cups,
                players: t.playerIds.map((id) => {
                    const profileId = players.find((p) => p.id === id)?.profileId;
                    const standing = standingOf(id, profileId);
                    return {
                        ...profile(profileId),
                        id,
                        points: t.points[id] ?? 0,
                        change: standing?.change ?? null,
                        standing: standing
                            ? {
                                  rank: standing.rank,
                                  tied: standing.tied,
                                  unranked: standing.unranked,
                              }
                            : null,
                    };
                }),
            });
            return {
                id: dto.id!,
                startedAt: dto.startedAt ?? '',
                lastActivityAt: dto.lastActivityAt ?? dto.startedAt ?? '',
                blue: team(blue),
                red: team(red),
                moves: moves.map((m) => {
                    const { name, avatarUrl } = profile(
                        players.find((p) => p.id === m.playerId)?.profileId
                    );
                    return {
                        name,
                        avatarUrl,
                        team: m.team,
                        move: m.move,
                        blue: m.blue,
                        red: m.red,
                    };
                }),
            };
        }),
    };
}
