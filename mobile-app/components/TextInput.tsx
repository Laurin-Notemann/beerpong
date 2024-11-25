import { forwardRef } from 'react';
import {
    TextInput as ReactNativeTextInput,
    TextInputProps as ReactNativeTextInputProps,
    View,
} from 'react-native';

import { theme } from '@/theme';

import Text from './Text';

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
        const color = '#fff';

        return (
            <View style={{ flex: 1 }}>
                <ReactNativeTextInput
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
