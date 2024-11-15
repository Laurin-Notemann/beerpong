import { theme } from "@/theme";
import { Text, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export interface IconHeadProps {
  iconName: string;
  title: string;
  description?: string;
}
export default function IconHead({
  iconName,
  title,
  description,
}: IconHeadProps) {
  return (
    <View
      style={{
        alignItems: "center",
        gap: 10,
      }}
    >
      <Icon name={iconName} size={60} color={theme.color.text.secondary} />
      <Text
        style={{
          fontSize: 22,

          fontWeight: "bold",

          color: theme.color.text.primary,

          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 20,

          color: theme.color.text.secondary,

          textAlign: "center",
        }}
      >
        {description}
      </Text>
    </View>
  );
}
