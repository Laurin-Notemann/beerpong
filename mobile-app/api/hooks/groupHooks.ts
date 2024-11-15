import { GroupSettingsProps } from '@/components/screens/GroupSettings';

import { useGroup } from '../calls/group/groupHooks';
import { ApiId } from '../types';

export const useGroupSettingsProps = (groupId: ApiId) => {
    const { data, ...props } = useGroup(groupId);

    const groupPageProps: GroupSettingsProps | null = data
        ? {
              groupName: data.name,
              hasPremium: false,
              pastSeasons: 0,
              pushNotificationsEnabled: true,
              groupCode: '123456',
          }
        : null;

    return {
        props: groupPageProps,
        ...props,
    };
};
