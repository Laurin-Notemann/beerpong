import React from "react";
import { Stack, useNavigation } from "expo-router";

import CreateGroup from "@/components/screens/CreateGroup";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Page() {
  const members = [
    { name: "Laurin" },
    { name: "foo" },
    { name: "bar" },
    { name: "schokoauto" },
  ];

  const nav = useNavigation();

  return (
    <GestureHandlerRootView>
      <Stack.Screen options={{ headerShown: false }} />
      <CreateGroup
        members={members}
        onCreateMember={(memberName) => {
          // @ts-ignore
          nav.navigate("createGroupSetName");
        }}
      />
    </GestureHandlerRootView>
  );
}
