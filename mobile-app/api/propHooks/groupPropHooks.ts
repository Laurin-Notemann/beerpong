import { GroupSettingsProps } from '@/components/screens/GroupSettings';

import { useGroupQuery } from '../calls/groupHooks';
import { useGroup } from '../calls/seasonHooks';
import { ScreenState } from '../types';

export const useGroupSettingsProps = (): ScreenState<GroupSettingsProps> => {
    const { groupId } = useGroup();

    const { data, ...screenState } = useGroupQuery(groupId);

    const props: GroupSettingsProps | null = data?.data
        ? {
              id: data.data.id!,
              groupCode: data.data.inviteCode!,
              groupName: data.data.name || 'Unknown',
              hasPremium: false,
              pastSeasons: 0,
              pushNotificationsEnabled: false,
          }
        : null;

    return {
        props,
        ...screenState,
    };
};
