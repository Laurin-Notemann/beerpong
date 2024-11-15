import {
  TextInput as ReactNativeTextInput,
  TextInputProps as ReactNativeTextInputProps,
} from "react-native";

import { theme } from "@/theme";

export interface TextInputProps extends ReactNativeTextInputProps {
  required?: boolean;
}

export default function TextInput({
  required = false,
  placeholder,
  ...rest
}: TextInputProps) {
  const color = "#fff";

  return (
    <ReactNativeTextInput
      placeholder={
        placeholder
          ? placeholder + (required ? " (Required)" : " (Optional)")
          : undefined
      }
      {...rest}
      style={[
        {
          paddingHorizontal: 16,
          paddingVertical: 13,

          borderRadius: 10,

          fontSize: 16,
          lineHeight: 22,

          backgroundColor: theme.panel.light.bg,
          color,
        },
        rest.style,
      ]}
      placeholderTextColor={theme.icon.secondary}
      selectionColor={color}
    />
  );
}
