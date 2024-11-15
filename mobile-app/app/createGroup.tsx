import React from "react";
import { Stack } from "expo-router";

import CreateGroup from "@/components/screens/CreateGroup";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Page() {
  const members = [
    { name: "Laurin" },
    { name: "foo" },
    { name: "bar" },
    { name: "schokoauto" },
  ];

  return (
    <GestureHandlerRootView>
      <Stack.Screen options={{ headerShown: false }} />
      <CreateGroup members={members} onCreateMember={(memberName) => {}} />
    </GestureHandlerRootView>
  );
}
