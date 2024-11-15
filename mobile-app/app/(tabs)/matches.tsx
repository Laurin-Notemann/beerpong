import { View } from "react-native";

import MatchesList from "@/components/MatchesList";
import { theme } from "@/theme";
import { mockMatches } from "@/components/mockData/matches";

export default function Screen() {
  return (
    <View
      style={{
        paddingHorizontal: 16,

        backgroundColor: theme.color.bg,
      }}
    >
      <MatchesList matches={mockMatches} />
    </View>
  );
}
