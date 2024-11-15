import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useNavigation } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { HeaderItem, navStyles } from "./(tabs)/_layout";
import { theme } from "@/theme";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="onboarding">
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{ title: "", headerShown: false }}
        />
        <Stack.Screen name="+not-found" />
        <Stack.Screen
          name="formations"
          options={{
            ...navStyles,
            headerTitle: "Formations",
            headerRight: () => <HeaderItem>Edit</HeaderItem>,
            headerTintColor: "white",
            headerBackTitle: "",
          }}
        />
        <Stack.Screen
          name="editFormation"
          options={{
            ...navStyles,
            headerTitle: "Edit Formation",
            headerRight: () => <HeaderItem>Done</HeaderItem>,
            headerTintColor: "white",
            headerBackTitle: "",
          }}
        />
        <Stack.Screen
          name="pastSeasons"
          options={{
            ...navStyles,
            headerTitle: "Past Seasons",
            headerRight: () => <HeaderItem>Done</HeaderItem>,
            headerTintColor: "white",
            headerBackTitle: "",
          }}
        />
        <Stack.Screen
          name="createNewPlayer"
          options={{
            presentation: "modal",
            ...navStyles,
            headerTitle: "Create new Player",
            headerLeft: () => <HeaderItem>Cancel</HeaderItem>,
            headerRight: () => <HeaderItem>Create</HeaderItem>,
            headerTintColor: "white",
            headerBackTitle: "",
          }}
        />

        <Stack.Screen
          name="editRankPlayersBy"
          options={{
            presentation: "modal",

            // headerLeft: () => <HeaderItem noMargin>Back</HeaderItem>,
            headerRight: () => <HeaderItem noMargin>Done</HeaderItem>,

            headerTitle: "Rank Players By",
            headerBackTitle: "",
            headerBackVisible: true,
            headerTintColor: "white",

            headerStyle: {
              backgroundColor: "#1B1B1B",
            },
            headerTitleStyle: {
              color: theme.color.text.primary,
            },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
