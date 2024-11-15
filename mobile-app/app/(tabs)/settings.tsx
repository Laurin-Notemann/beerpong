import { useGroupSettingsProps } from "@/api/hooks/groupHooks";
import Text from "@/components/Text";
import GroupSettingsScreen from "@/components/screens/GroupSettings";

export default function Screen() {
  const { props, isLoading, error } = useGroupSettingsProps("123456");

  if (isLoading) {
    return <Text color="primary">Loading...</Text>;
  }

  if (error || !props) {
    return <Text color="negative">Error</Text>;
  }

  return <GroupSettingsScreen {...props} />;
}
