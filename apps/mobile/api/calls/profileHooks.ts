import { QueryClient } from '@tanstack/react-query';

import { fetchAssetUrl } from '@/api/calls/assetHooks';
import { ApiId, Profile, WithProfile } from '@/api/types';
import { QK } from '@/api/utils/reactQuery';
import { Client } from '@/openapi/openapi';

/**
 * fetches all profiles of a group, including their avatar urls.
 *
 * meant to be used inside of other query functions (e.g. for players or leaderboards),
 * which only receive `profileId`s from the backend. concurrent calls share a single request,
 * and realtime profile and asset events invalidate it (useRealtimeConnection).
 */
export async function fetchProfiles(
    qc: QueryClient,
    api: Promise<Client>,
    groupId: ApiId
): Promise<Profile[]> {
    return qc.fetchQuery({
        queryKey: [QK.group, groupId, QK.profiles],
        queryFn: async (): Promise<Profile[]> => {
            const res = await (await api).listAllProfiles({ groupId });

            return Promise.all(
                (res.data.data ?? []).map(async (profile) => ({
                    ...profile,
                    // `avatarUrl` is null without an avatar; an API older than this app
                    // leaves it out, and then the asset is looked up
                    avatarUrl:
                        profile.avatarUrl !== undefined
                            ? profile.avatarUrl
                            : await fetchAssetUrl(
                                  qc,
                                  api,
                                  profile.assetIdAvatar
                              ),
                }))
            );
        },
    });
}

export function withProfiles<T extends { profileId?: string | null }>(
    items: T[],
    profiles: Profile[]
): WithProfile<T>[] {
    return items.map((i) => ({
        ...i,
        profile: profiles.find((j) => j.id === i.profileId),
    }));
}
