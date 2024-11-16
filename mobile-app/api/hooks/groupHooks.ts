import { GroupSettingsProps } from '@/components/screens/GroupSettings';

import { useGroup } from '../calls/group/groupHooks';
import { ApiId } from '../types';

export const useGroupSettingsProps = (groupId: ApiId) => {
    const { data, ...props } = useGroup(groupId);

    const groupPageProps: GroupSettingsProps | null = data
        ? {
            groupCode: data.inviteCode ?? "NO CODE FOUND",
            groupName: data.name ?? "NO NAME FOUND",
            hasPremium: false,
            pastSeasons: 0,
            pushNotificationsEnabled: false,
          }
        : null;

    return {
        props: groupPageProps,
        ...props,
    };
};
