import { PropsWithChildren } from "react";
import { View } from "react-native";

export interface InputModalProps extends PropsWithChildren {}
export default function InputModal({ children }: InputModalProps) {
  return (
    <View
      style={{
        alignItems: "center",
        gap: 32,

        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,

        backgroundColor: "#1B1B1B",
      }}
    >
      {children}
    </View>
  );
}
