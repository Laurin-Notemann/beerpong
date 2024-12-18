import { useNavigation } from '@/app/navigation/useNavigation';
import { GroupSettingsProps } from '@/components/screens/GroupSettings';
import {
    showErrorToast,
    showSuccessToast,
    showYouLeftGroupToast,
} from '@/toast';
import { launchImageLibrary } from '@/utils/fileUpload';
import { ConsoleLogger } from '@/utils/logging';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import {
    useGroupQuery,
    useUpdateGroupWallpaperMutation,
} from '../calls/groupHooks';
import { useAllSeasonsQuery, useGroup } from '../calls/seasonHooks';
import { ScreenState } from '../types';

export const useGroupSettingsProps = (): ScreenState<GroupSettingsProps> => {
    const { groupId, group } = useGroup();

    const { removeGroup } = useGroupStore();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const nav = useNavigation();

    const { mutateAsync } = useUpdateGroupWallpaperMutation();

    const pastSeasons = (seasonsQuery.data?.data?.length ?? 1) - 1;

    const { data, ...screenState } = useGroupQuery(groupId);

    async function onUploadWallpaperPress() {
        const [result] = await launchImageLibrary({
            // mediaTypes: ['images'],
            selectionLimit: 1,
        });
        const mimeType = result?.mimeType;
        const byteArray = result?.byteArray;

        if (!groupId || !mimeType || !byteArray) return;

        try {
            await mutateAsync({
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
            // TODO: implement this
            showSuccessToast('Removed group wallpaper.');
        } catch (err) {
            ConsoleLogger.error('failed to remove group wallpaper:', err);
            showErrorToast('Failed to remove group wallpaper.');
        }
    }

    function onLeaveGroup() {
        if (!groupId) return;

        // TODO: i can't get this to actually show up
        setTimeout(
            () => showYouLeftGroupToast(group.data?.name ?? 'Unknown Group'),
            3000
        );

        removeGroup(groupId);

        nav.navigate('index');
    }

    const props: GroupSettingsProps | null = data?.data
        ? {
              id: data.data.id!,
              groupCode: data.data.inviteCode!,
              groupName: data.data.name || 'Unknown Group',
              hasPremium: false,
              pastSeasons,
              pushNotificationsEnabled: false,
              onUploadWallpaperPress,
              onDeleteWallpaperPress,
              onLeaveGroup,
              wallpaperAsset: data.data.wallpaperAsset,
          }
        : null;

    return {
        props,
        ...screenState,
    };
};
