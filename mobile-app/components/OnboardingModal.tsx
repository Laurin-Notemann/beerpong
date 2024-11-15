import { Image, View } from "react-native";
import Button from "./Button";
import { useNavigation } from "expo-router";
import Text from "./Text";

export default function OnboardingModal({}: {}) {
  const navigation = useNavigation();

  return (
    <View
      style={{
        alignItems: "center",
        gap: 32,

        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 128,

        backgroundColor: "#1B1B1B",
      }}
    >
      <Text variant="h3" color="primary" bold>
        Welcome to Beerpong Pro
      </Text>
      <Text variant="body1" color="secondary">
        - sick leaderboard{"\n"}- intuitively assign points {"\n"}- view sick
        stats {"\n"}- Completely free, forever
      </Text>
      <View
        style={{
          flexDirection: "row",
        }}
      >
        <Image
          source={require("../assets/images/phone.png")}
          style={{
            width: 100,
            height: 100 * 2.1741293532,
            resizeMode: "contain",

            transform: [{ rotateY: "45deg" }],
          }}
        />
        <Image
          source={require("../assets/images/phone.png")}
          style={{
            width: 100,
            height: 100 * 2.1741293532,
            resizeMode: "contain",
          }}
        />
        <Image
          source={require("../assets/images/phone.png")}
          style={{
            width: 100,
            height: 100 * 2.1741293532,
            resizeMode: "contain",

            transform: [{ rotateY: "-45deg" }],
          }}
        />
      </View>
      <View
        style={{
          alignSelf: "stretch",
          gap: 8,
        }}
      >
        <Button
          variant="primary"
          title="Join a Friend Group"
          // @ts-ignore
          onPress={() => navigation.navigate("joinGroup")}
        />
        <Button
          variant="secondary"
          title="Create a Friend Group"
          // @ts-ignore
          onPress={() => navigation.navigate("createGroup")}
        />
      </View>
    </View>
  );
}
