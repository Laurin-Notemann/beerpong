import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import {
    useDeleteWallpaperMutation,
    useGroupQuery,
    useUpdateGroupWallpaperMutation,
} from '@/api/calls/groupHooks';
import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { ScreenState } from '@/api/types';
import { getAssetUrl } from '@/api/utils/assetUrl';
import { GroupSettingsProps } from '@/components/screens/GroupSettings';
import {
    showErrorToast,
    showSuccessToast,
    showYouLeftGroupToast,
} from '@/toast';
import { launchImageLibrary } from '@/utils/fileUpload';
import { ConsoleLogger } from '@/utils/logging';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

// eslint-disable-next-line no-restricted-imports
import { QK } from '../utils/reactQuery';

export const useGroupSettingsProps = (): ScreenState<GroupSettingsProps> => {
    const router = useRouter();
    const { groupId, group } = useGroup();

    const { leaveGroupMutation } = useGroupStore();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const updateGroupWallpaperMutation = useUpdateGroupWallpaperMutation();

    const deleteWallpaperMutation = useDeleteWallpaperMutation();

    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const { data, ...screenState } = useGroupQuery(groupId);

    async function onUploadWallpaperPress() {
        const [result] = await launchImageLibrary({
            mediaTypes: ['images'],
            selectionLimit: 1,
        });
        const mimeType = result?.mimeType;
        const byteArray = result?.byteArray;

        if (!groupId || !mimeType || !byteArray) return;

        try {
            await updateGroupWallpaperMutation.mutateAsync({
                groupId,
                byteArray,
                mimeType,
            });
            showSuccessToast('Updated group wallpaper.');
        } catch (err) {
            ConsoleLogger.error('failed to upload group wallpaper:', err);
            showErrorToast('Failed to upload group wallpaper.');
        }
    }

    async function onDeleteWallpaperPress() {
        if (!groupId) return;

        try {
            await deleteWallpaperMutation.mutateAsync({ groupId });

            showSuccessToast('Removed group wallpaper.');
        } catch (err) {
            ConsoleLogger.error('failed to remove group wallpaper:', err);
            showErrorToast('Failed to remove group wallpaper.');
        }
    }

    const queryClient = useQueryClient();

    async function onLeaveGroup() {
        if (!groupId) return;

        try {
            // TODO: i can't get this to actually show up
            setTimeout(
                () =>
                    showYouLeftGroupToast(group.data?.name ?? 'Unknown Group'),
                3000
            );

            await leaveGroupMutation.mutateAsync(groupId);

            await queryClient.invalidateQueries({
                queryKey: [QK.group, 'myGroups'],
            });

            router.dismissAll();
            router.replace('/');
        } catch (err) {
            ConsoleLogger.error('failed to leave group:', err);
            showErrorToast('Failed to leave group.');
        }
    }

    const props: GroupSettingsProps | null = data?.data
        ? {
              id: data.data.id!,
              groupCode: data.data.inviteCode!,
              groupName: data.data.name || 'Unknown Group',
              hasPremium: false,
              pastSeasons: pastSeasons.length,
              pushNotificationsEnabled: false,
              onUploadWallpaperPress,
              onDeleteWallpaperPress,
              onLeaveGroup,
              wallpaperAssetUrl: getAssetUrl(data.data.assetIdWallpaper),
              isUpdatingWallpaper: updateGroupWallpaperMutation.isPending,
          }
        : null;

    return {
        props,
        ...screenState,
    };
};
