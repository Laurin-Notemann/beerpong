import { GroupSettingsProps } from "@/components/screens/GroupSettings";
import { ApiId } from "../types";
import { useGroup } from "../calls/group/groupHooks";

export const useGroupSettingsProps = (groupId: ApiId) => {
    const { data, isLoading, error } = useGroup(groupId);

    const groupPageProps: GroupSettingsProps | null = data ? {
        groupName: data.name,
        hasPremium: false,
        pastSeasons: 0,
        pushNotificationsEnabled: true,
        groupCode: "123456",
    } : null;

    return {
        groupPageProps,
        isLoading,
        error,
    };
};
