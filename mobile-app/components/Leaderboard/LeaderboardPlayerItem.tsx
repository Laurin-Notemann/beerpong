import { TouchableOpacity } from "react-native";
import Avatar from "../Avatar";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";
import { theme } from "@/theme";
import { useNavigation } from "expo-router";

export interface LeaderboardPlayerItem {
  placement: number;

  name: string;
  avatarUrl?: string | null;

  matches: number;
  matchesWon: number;
  points: number;
  elo: number;
}
export default function LeaderboardPlayerItem({
  placement,
  name,
  avatarUrl,
  matches,
  matchesWon,
  points,
  elo,
}: LeaderboardPlayerItem) {
  const averagePointsPerMatch = (points / matches).toFixed(1);

  const nav = useNavigation();

  return (
    // <Link
    //   to={{
    //     params: {
    //       id: "#",
    //     },
    //     screen: "rules",
    //   }}
    // >
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",

        height: 60.5,
        paddingHorizontal: 20,
      }}
      // @ts-ignore
      onPress={() => nav.navigate("player")}
    >
      <ThemedText
        style={{
          marginRight: 12,

          fontSize: 15,
          color: theme.color.text.secondary,
        }}
      >
        {placement}
      </ThemedText>
      <Avatar name={name} size={36} />
      <ThemedView
        style={{
          marginLeft: 12,
        }}
      >
        <ThemedText
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: theme.color.text.primary,
          }}
        >
          {name}
        </ThemedText>
        <ThemedText style={{ fontSize: 15, color: theme.color.text.secondary }}>
          {points} points · {matches} matches
        </ThemedText>
      </ThemedView>
      <ThemedText
        style={{
          marginLeft: "auto",

          fontSize: 15,
          color: theme.color.text.secondary,
        }}
      >
        {averagePointsPerMatch}
      </ThemedText>
    </TouchableOpacity>
    // </Link>
  );
}
