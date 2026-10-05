import type * as Dto from '@/openapi/openapi';
import { apiUrl } from '~/apiUrl';

/** an error the API answered with, e.g. `groupInviteNotFound` */
export class ApiError extends Error {
    constructor(
        readonly code: string,
        readonly httpCode: number
    ) {
        super(`Versus API: ${code} (${httpCode})`);
    }
}

async function call<T>(
    path: string,
    { method = 'GET', token, body }: { method?: string; token?: string; body?: unknown } = {}
): Promise<T> {
    const res = await fetch(apiUrl() + path, {
        method,
        headers: {
            ...(body !== undefined && { 'Content-Type': 'application/json' }),
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    let envelope: { status?: string; data?: T; error?: { code?: string } } | undefined;
    try {
        envelope = JSON.parse(text);
    } catch {
        // the auth filter answers in plain text
    }
    if (!res.ok || envelope?.status !== 'OK') {
        throw new ApiError(envelope?.error?.code ?? (text.slice(0, 80) || 'unknown'), res.status);
    }
    return envelope.data as T;
}

/**
 * A TV signs up like a phone does: a user of its own (the API only knows iOS and Android
 * installations; `deviceId` marks it as a TV) that joins the group as a member. Members
 * without a profile don't show up anywhere in the group.
 */
export async function signup(displayId: string) {
    const dto = await call<Dto.AuthTokenDto>('/auth/signup', {
        method: 'POST',
        body: { installationType: 'ANDROID', deviceId: `versus-tv:${displayId}` },
    });
    return dto.token!;
}

const accessTokens = new Map<string, { token: string; expiresAt: number }>();

/** an access token for this refresh token; they live an hour, so they're reused for 50 minutes */
async function accessToken(refreshToken: string) {
    const cached = accessTokens.get(refreshToken);
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const dto = await call<Dto.AuthTokenDto>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
    });
    accessTokens.set(refreshToken, { token: dto.token!, expiresAt: Date.now() + 50 * 60_000 });
    return dto.token!;
}

/** the API as one TV's user */
export function apiFor(refreshToken: string) {
    const get = async <T>(path: string) =>
        call<T>(path, { token: await accessToken(refreshToken) });
    const post = async <T>(path: string, body?: unknown) =>
        call<T>(path, { method: 'POST', token: await accessToken(refreshToken), body });

    return {
        groupByInviteCode: (code: string) =>
            get<Dto.GroupDto>(`/groups?inviteCode=${encodeURIComponent(code)}`),
        async join(groupId: string) {
            try {
                await post(`/groups/${groupId}/join`);
            } catch (err) {
                // joined before, e.g. when a phone connects the TV to the same group again
                if (!(err instanceof ApiError && err.code === 'groupAlreadyInGroup')) throw err;
            }
        },
        leave: (groupId: string) => post(`/groups/${groupId}/leave`),
        group: (groupId: string) => get<Dto.GroupDto>(`/groups/${groupId}`),
        seasons: (groupId: string) => get<Dto.SeasonDto[]>(`/groups/${groupId}/seasons`),
        profiles: (groupId: string) => get<Dto.ProfileDto[]>(`/groups/${groupId}/profiles`),
        players: (groupId: string, seasonId: string) =>
            get<Dto.PlayerDto[]>(`/groups/${groupId}/seasons/${seasonId}/players`),
        ruleMoves: (groupId: string, seasonId: string) =>
            get<Dto.RuleMoveDto[]>(`/groups/${groupId}/seasons/${seasonId}/rule-moves`),
        leaderboard: (groupId: string, scope: string, seasonId: string | null) =>
            get<Dto.LeaderboardDto>(
                `/groups/${groupId}/leaderboard?scope=${scope}` +
                    (seasonId ? `&seasonId=${seasonId}` : '')
            ),
        /** the board with these live matches counted as if they ended now (see the API) */
        projection: (
            groupId: string,
            scope: string,
            seasonId: string | null,
            matches: { teams: Dto.TeamCreateDto[] }[]
        ) =>
            post<Dto.LeaderboardDto>(
                `/groups/${groupId}/leaderboard/projection?scope=${scope}` +
                    (seasonId ? `&seasonId=${seasonId}` : ''),
                { matches }
            ),
        liveMatches: (groupId: string) =>
            get<Dto.LiveMatchDto[]>(`/groups/${groupId}/live-matches`),
    };
}

const assetUrls = new Map<string, { url: string | null; expiresAt: number }>();

/** where an avatar can be loaded from; asset URLs are signed, so they're kept for 10 minutes */
export async function assetUrl(assetId: string | null | undefined) {
    if (!assetId) return null;
    const cached = assetUrls.get(assetId);
    if (cached && cached.expiresAt > Date.now()) return cached.url;

    const url = await call<Dto.AssetMetadataDto>(`/assets/${assetId}`)
        .then((i) => i.url ?? null)
        .catch(() => null);
    assetUrls.set(assetId, { url, expiresAt: Date.now() + 10 * 60_000 });
    return url;
}
