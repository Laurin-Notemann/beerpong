import { useRouter } from 'expo-router';

import { useAssetQuery } from '@/api/calls/assetHooks';
import {
    useDeleteWallpaperMutation,
    useGroupQuery,
    useUpdateGroupWallpaperMutation,
} from '@/api/calls/groupHooks';
import {
    getPastSeasons,
    useAllSeasonsQuery,
    useGroup,
} from '@/api/calls/seasonHooks';
import { ScreenState } from '@/api/types';
import { compressImage, IMAGE_SIZES } from '@/api/utils/compressImage';
import { GroupSettingsProps } from '@/components/screens/GroupSettings';
import {
    showErrorToast,
    showSuccessToast,
    showYouLeftGroupToast,
} from '@/toast';
import { launchImageLibrary } from '@/utils/fileUpload';
import { ConsoleLogger } from '@/utils/logging';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export const useGroupSettingsProps = (): ScreenState<GroupSettingsProps> => {
    const router = useRouter();
    const { groupId, group } = useGroup();

    const { leaveGroupMutation } = useGroupStore();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const updateGroupWallpaperMutation = useUpdateGroupWallpaperMutation();

    const deleteWallpaperMutation = useDeleteWallpaperMutation();

    const pastSeasons = getPastSeasons(seasonsQuery.data?.data);

    const { data, ...screenState } = useGroupQuery(groupId);

    const wallpaperQuery = useAssetQuery(data?.data?.assetIdWallpaper);

    async function onUploadWallpaperPress() {
        const [result] = await launchImageLibrary({
            mediaTypes: ['images'],
            selectionLimit: 1,
        });
        if (!groupId || !result) return;

        try {
            const { byteArray, mimeType } = await compressImage(
                result.uri,
                IMAGE_SIZES.wallpaper
            );
            await updateGroupWallpaperMutation.mutateAsync({
                groupId,
                byteArray,
                mimeType,
            });
            showSuccessToast('Updated group wallpaper.');
        } catch (err) {
            ConsoleLogger.error('failed to upload group wallpaper:', err);
            showErrorToast('Failed to upload group wallpaper.', err);
        }
    }

    async function onDeleteWallpaperPress() {
        if (!groupId) return;

        try {
            await deleteWallpaperMutation.mutateAsync({ groupId });

            showSuccessToast('Removed group wallpaper.');
        } catch (err) {
            ConsoleLogger.error('failed to remove group wallpaper:', err);
            showErrorToast('Failed to remove group wallpaper.', err);
        }
    }

    async function onLeaveGroup() {
        if (!groupId) return;

        try {
            await leaveGroupMutation.mutateAsync(groupId);

            router.dismissAll();
            router.replace('/');
            showYouLeftGroupToast(group?.data?.name ?? 'Unknown Group');
        } catch (err) {
            ConsoleLogger.error('failed to leave group:', err);
            showErrorToast('Failed to leave group.', err);
        }
    }

    const props: GroupSettingsProps | null = data?.data
        ? {
              id: data.data.id!,
              groupCode: data.data.inviteCode!,
              groupName: data.data.name || 'Unknown Group',
              hasPremium: false,
              pastSeasons: pastSeasons.length,
              onUploadWallpaperPress,
              onDeleteWallpaperPress,
              onLeaveGroup,
              wallpaperAsset: wallpaperQuery.data?.data,
              isUpdatingWallpaper: updateGroupWallpaperMutation.isPending,
          }
        : null;

    return {
        props,
        ...screenState,
    };
};
