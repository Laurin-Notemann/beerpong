import { TouchableOpacity, View } from "react-native";
import { Text } from "react-native";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { useNavigation } from "expo-router";

import Avatar from "@/components/Avatar";
import MenuItem from "@/components/Menu/MenuItem";
import MenuSection from "@/components/Menu/MenuSection";
import { theme } from "@/theme";
import MatchesList, { Match } from "@/components/MatchesList";
import { HighestChip, LowestChip } from "@/components/Chip";

function Stat({
  value,
  title,
  isHighest = false,
  isLowest = false,
}: {
  value: string | number;
  title: string;
  isHighest?: boolean;
  isLowest?: boolean;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      {isHighest && <HighestChip />}
      {isLowest && <LowestChip />}
      <Text
        style={{
          fontSize: 17,
          color: theme.color.text.primary,

          fontWeight: 600,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: theme.color.text.secondary,

          fontWeight: 500,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

export interface PlayerScreenProps {
  placement: number;

  name: string;
  avatarUrl?: string | null;

  matches: Match[];
  matchesWon: number;
  points: number;
  elo: number;
  hasPremium?: boolean;

  pastSeasons: number;
}
export default function PlayerScreen({
  placement,
  name,
  avatarUrl,
  matches,
  matchesWon,
  points,
  elo,
  hasPremium = false,
  pastSeasons,
}: PlayerScreenProps) {
  const nav = useNavigation();

  const averagePointsPerMatch = (points / matches.length).toFixed(1);
  const matchesWonPercentage = Math.round((matchesWon / matches.length) * 100);

  return (
    <GestureHandlerRootView>
      <ScrollView
        style={{
          flex: 1,

          backgroundColor: theme.color.bg,
        }}
        contentContainerStyle={{
          alignItems: "center",

          paddingHorizontal: 16,
          paddingBottom: 32,
        }}
      >
        <Avatar
          size={96}
          style={{ marginTop: 32, marginBottom: 8 }}
          placement={placement}
          name={name}
        />
        <Text
          style={{
            fontSize: 15,
            color: theme.color.text.secondary,
          }}
        >
          {matches.length ? averagePointsPerMatch : "--"}
        </Text>
        <Text
          style={{
            fontSize: 25,
            color: theme.color.text.primary,

            marginBottom: 32,
          }}
        >
          {name}
        </Text>

        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "flex-end",

            marginBottom: 32,
            gap: 8,
          }}
        >
          <Stat
            title="Average points"
            value={matches.length ? averagePointsPerMatch : "--"}
            isLowest
          />
          <Stat title="Total points" value={points} />
          <Stat
            title="Matches won"
            value={
              matches.length
                ? `${matchesWon} of ${matches.length} (${matchesWonPercentage}%)`
                : "--"
            }
            isHighest
          />
          <Stat title="Elo" value={elo} />
        </TouchableOpacity>
        <MenuSection
          style={{
            alignSelf: "stretch",
          }}
        >
          <MenuItem
            title="Past Seasons"
            headIcon="pencil-outline"
            tailContent={pastSeasons}
            tailIconType="next"
            // @ts-ignore
            onPress={() => nav.navigate("pastSeasons")}
          />
        </MenuSection>
        <MatchesList matches={matches} />
      </ScrollView>
    </GestureHandlerRootView>
  );
}
