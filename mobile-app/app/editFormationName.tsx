import React, { useLayoutEffect, useState } from "react";

import InputModal from "@/components/InputModal";
import TextInput from "@/components/TextInput";
import { Stack, useNavigation } from "expo-router";
import { HeaderItem } from "./(tabs)/_layout";
import { theme } from "@/theme";

export default function Page() {
  const [value, setValue] = useState("");

  const navigation = useNavigation();

  // useLayoutEffect(() => {
  //   navigation.setOptions({
  //     presentation: "modal",
  //   });
  // }, [navigation]);

  return (
    <>
      <Stack.Screen
        options={{
          // presentation: "modal",

          // headerLeft: () => <HeaderItem noMargin>Back</HeaderItem>,
          headerRight: () => <HeaderItem noMargin>Done</HeaderItem>,

          headerTitle: "Formation Name",
          headerBackTitle: "",
          headerBackVisible: true,
          headerTintColor: "#fff",

          headerStyle: {
            backgroundColor: "#1B1B1B",
          },
          headerTitleStyle: {
            color: theme.color.text.primary,
          },
        }}
      />
      <InputModal>
        <TextInput
          required
          placeholder="Formation Name"
          value={value}
          onChangeText={setValue}
          autoFocus
          style={{
            alignSelf: "stretch",
          }}
        />
      </InputModal>
    </>
  );
}

Page.options = {
  presentation: "modal",

  headerRight: () => <HeaderItem noMargin>Dan</HeaderItem>,
};
