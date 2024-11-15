import GroupSettingsScreen from "@/components/screens/GroupSettings";

export default function Screen() {
  return (
    <GroupSettingsScreen
      groupName="Die Reise (beheizter Pool)"
      hasPremium
      pushNotificationsEnabled
      pastSeasons={0}
      groupCode="4LM LBI H9Z"
    />
  );
}
