import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { useGetMyGroupsQuery } from '@/api/calls/groupHooks';
import { useApi } from '@/api/utils/create-api';
import { DebugRow, DebugScreen } from '@/components/debug/DebugScreen';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import {
    getInstallationId,
    getSessionDebugInfo,
    getValidAccessToken,
} from '@/lib/auth/useAuth';
import { versusDeviceStorage } from '@/lib/deviceStorage';
import { showErrorToast, showSuccessToast } from '@/toast';

export default function Page() {
    const { api } = useApi();
    const myGroups = useGetMyGroupsQuery();

    // Not persisted or shared with the app's queries: always read fresh.
    const session = useQuery({
        queryKey: ['debug', 'session'],
        gcTime: 0,
        queryFn: async () => ({
            ...getSessionDebugInfo(),
            hasRefreshToken: !!(await versusDeviceStorage.getRefreshToken()),
            installationId: await getInstallationId().catch(() => null),
        }),
    });

    const refreshAccessToken = async () => {
        try {
            await getValidAccessToken(await api);
            await session.refetch();
            showSuccessToast('Access token is valid');
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <DebugScreen title="Session">
            <MenuSection title="Account">
                <DebugRow first label="User ID" value={session.data?.userId} />
                <DebugRow
                    label="Access token expires"
                    value={session.data?.accessTokenExpiresAt?.toISOString()}
                />
                <DebugRow
                    label="Refresh token stored"
                    value={session.data?.hasRefreshToken}
                />
                <DebugRow
                    label="Installation ID"
                    value={session.data?.installationId}
                />
            </MenuSection>
            <MenuSection title="Groups">
                <DebugRow
                    first
                    label="Member of"
                    value={myGroups.data?.data
                        ?.map((g) => `${g.name} (${g.inviteCode})`)
                        .join(', ')}
                />
                <DebugRow label="Error" value={myGroups.error?.message} />
            </MenuSection>
            <MenuSection title="Actions">
                <MenuItem
                    border={false}
                    title="Refresh access token"
                    headIcon="key-variant"
                    onPress={refreshAccessToken}
                />
            </MenuSection>
        </DebugScreen>
    );
}
