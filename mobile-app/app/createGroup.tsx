import React from "react";
import { Stack } from "expo-router";

import ComingSoon from "@/components/ComingSoon";

export default function Page() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ComingSoon />
    </>
  );
}
