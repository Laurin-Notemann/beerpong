import { GroupSettingsProps } from '@/components/screens/GroupSettings';

import { useGroupQuery } from '../calls/groupHooks';
import { ApiId } from '../types';

export const useGroupSettingsProps = (groupId: ApiId | null) => {
    const { data, ...props } = useGroupQuery(groupId);

    const groupPageProps: GroupSettingsProps | null = data
        ? {
              groupCode: data.data!.inviteCode ?? 'NO CODE FOUND',
              groupName: data.data!.name ?? 'NO NAME FOUND',
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
