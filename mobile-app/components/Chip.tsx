import { theme } from "@/theme";
import { Text } from "react-native";

export interface ChipProps {
  title: string;
  backgroundColor: string;
  color: string;
}
export default function Chip({ title, backgroundColor, color }: ChipProps) {
  return (
    <Text
      style={{
        paddingHorizontal: 2,
        marginBottom: 4,

        backgroundColor,
        color,

        fontSize: 12,
        fontWeight: 700,
        borderRadius: 2,
      }}
    >
      {title}
    </Text>
  );
}

export function HighestChip() {
  return (
    <Chip title="HIGHEST" backgroundColor={theme.color.positive} color="#fff" />
  );
}
export function LowestChip() {
  return (
    <Chip title="LOWEST" backgroundColor={theme.color.negative} color="#fff" />
  );
}
export function PremiumChip() {
  return (
    <Chip title="HIGHEST" backgroundColor={theme.color.premium} color="#fff" />
  );
}
