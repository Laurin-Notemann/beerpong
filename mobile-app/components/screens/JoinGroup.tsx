import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, Text } from 'react-native';
import {
    CodeField,
    useBlurOnFulfill,
    useClearByFocusCell,
} from 'react-native-confirmation-code-field';

import { theme } from '@/theme';

import Button from '../Button';

const CODE_LENGTH = 9;

export interface JoinGroupProps {
    onSubmit: (code: string) => void;
}
export default function JoinGroup({ onSubmit }: JoinGroupProps) {
    const [code, setCode] = useState('');

    const ref = useBlurOnFulfill({ value: code, cellCount: CODE_LENGTH });
    const [props, getCellOnLayoutHandler] = useClearByFocusCell({
        value: code,
        setValue: (value) => setCode(value.toUpperCase()),
    });

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView
                style={{
                    alignItems: 'center',

                    flex: 1,
                    paddingHorizontal: 16,

                    backgroundColor: theme.color.bg,
                }}
            >
                <CodeField
                    ref={ref}
                    {...props}
                    value={code}
                    onChangeText={setCode}
                    cellCount={CODE_LENGTH}
                    textContentType="oneTimeCode"
                    rootStyle={{
                        paddingTop: 128 * 2,
                        paddingBottom: 64,
                        gap: 8,
                    }}
                    renderCell={({ index, symbol, isFocused }) => (
                        <>
                            <Text
                                key={`value-${index}`}
                                style={[
                                    {
                                        borderWidth: 1,
                                        borderColor: theme.color.text.secondary,
                                        borderRadius: 4,

                                        width: isFocused ? 29 : 27,
                                        height: isFocused ? 40 : 38,

                                        margin: isFocused ? 0 : 1,

                                        textAlign: 'center',

                                        color: theme.color.text.primary,

                                        fontWeight: 700,

                                        fontSize: 22,

                                        lineHeight: 36,
                                    },
                                    isFocused && {
                                        borderColor: theme.color.text.primary,
                                        borderWidth: 2,
                                    },
                                ]}
                                onLayout={getCellOnLayoutHandler(index)}
                            >
                                {symbol}
                            </Text>
                            {(index === 2 || index === 5) && (
                                <Text
                                    key={`seperator-${index}`}
                                    style={{
                                        lineHeight: 38,

                                        fontSize: 22,

                                        color: theme.color.text.tertiary,
                                    }}
                                >
                                    -
                                </Text>
                            )}
                        </>
                    )}
                />
                <Button
                    variant="primary"
                    size="large"
                    title="Join"
                    onPress={() => onSubmit(code)}
                />
            </SafeAreaView>
        </>
    );
}
