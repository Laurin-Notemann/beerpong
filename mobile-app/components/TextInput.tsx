import { forwardRef, useEffect } from 'react';
import {
    TextInput as ReactNativeTextInput,
    TextInputProps as ReactNativeTextInputProps,
    View,
} from 'react-native';

import Text from '@/components/Text';
import { triggerHapticBump } from '@/haptics';
import { useTheme } from '@/theme';

export interface TextInputProps extends ReactNativeTextInputProps {
    required?: boolean;

    errorMessage?: string;
}

const TextInput = forwardRef<ReactNativeTextInput, TextInputProps>(
    function TextInput(
        {
            required = false,
            placeholder,
            errorMessage,
            ...rest
        }: TextInputProps,
        ref
    ) {
        const theme = useTheme();

        const color = theme.color.text.primary;

        useEffect(() => {
            if (errorMessage) {
                triggerHapticBump('input:error');
            }
        }, [errorMessage]);

        return (
            <View style={{ flex: 1, minHeight: 48 }}>
                <ReactNativeTextInput
                    keyboardAppearance={theme.keyboardAppearance}
                    ref={ref}
                    placeholder={
                        placeholder
                            ? placeholder +
                              (required ? ' (Required)' : ' (Optional)')
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
                        errorMessage
                            ? {
                                  borderWidth: 1,
                                  borderColor: theme.color.negative,
                              }
                            : {
                                  borderWidth: 1,
                                  borderColor: theme.panel.light.bg,
                              },
                        rest.style,
                    ]}
                    placeholderTextColor={theme.icon.secondary}
                    selectionColor={color}
                />
                {errorMessage && (
                    <Text
                        color="negative"
                        variant="subtitle2"
                        style={{
                            marginTop: 8,
                        }}
                    >
                        {errorMessage}
                    </Text>
                )}
            </View>
        );
    }
);
export default TextInput;
