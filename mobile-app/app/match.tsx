import MatchPlayers from "@/components/MatchPlayers";
import React, { useState } from "react";
import { theme } from "@/theme";
import { Stack, useNavigation } from "expo-router";
import { HeaderItem } from "./(tabs)/_layout";
import MatchVsHeader from "@/components/MatchVsHeader";
import { mockMatches } from "@/components/mockData/matches";
import { ScrollView } from "react-native";

export default function Page() {
  const navigation = useNavigation();

  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Match",
          headerStyle: {
            backgroundColor: theme.color.topNav,

            // @ts-ignore
            elevation: 0, // For Android
            shadowOpacity: 0, // For iOS
            borderBottomWidth: 0, // Removes the border for both platforms
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerRight: () => (
            <HeaderItem
              onPress={() => {
                setIsEditing((prev) => !prev);
              }}
            >
              {isEditing ? "Done" : "Edit"}
            </HeaderItem>
          ),
          headerTitle: () => (
            <MatchVsHeader
              match={mockMatches[0]}
              style={{
                bottom: 4,
              }}
            />
          ),
        }}
      />
      <ScrollView
        style={{
          flex: 1,

          backgroundColor: theme.color.bg,
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 32,
          paddingBottom: 32,
        }}
      >
        <MatchPlayers editable={isEditing} />
      </ScrollView>
    </>
  );
}
