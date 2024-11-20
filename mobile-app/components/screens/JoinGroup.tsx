import { Stack } from 'expo-router';
import React, { Fragment, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text } from 'react-native';
import {
    CodeField,
    useBlurOnFulfill,
    useClearByFocusCell,
} from 'react-native-confirmation-code-field';

import { env } from '@/api/env';
import { theme } from '@/theme';

import Button from '../Button';

const nonAlphaNumericChars = /[^a-zA-Z0-9]/g;

const seperatorDash = (
    <Text
        style={{
            lineHeight: 38,

            fontSize: 22,

            color: theme.color.text.tertiary,
        }}
    >
        -
    </Text>
);

export interface JoinGroupProps {
    isLoading?: boolean;
    isNotFound?: boolean;

    onSubmit: (code: string) => void;
}
export default function JoinGroup({
    onSubmit,
    isLoading = false,
    isNotFound = false,
}: JoinGroupProps) {
    const [code, setCode] = useState('');

    const ref = useBlurOnFulfill({
        value: code,
        cellCount: env.groupCode.length,
    });
    const [props, getCellOnLayoutHandler] = useClearByFocusCell({
        value: code,
        setValue: (value) => setCode(value.toUpperCase()),
    });

    useEffect(() => {
        ref.current!.focus();
    }, [ref]);

    useEffect(() => {
        // auto submit when the user has entered the full code
        if (code.length === env.groupCode.length) {
            onSubmit(code);
        }
    }, [code, onSubmit]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: '',
                    headerBackTitleVisible: false,
                    headerBackVisible: true,
                    headerTintColor: '#fff',

                    headerStyle: {
                        backgroundColor: '#000',
                    },
                    headerTitleStyle: {
                        color: theme.color.text.primary,
                    },
                    headerShown: true,
                }}
            />
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
                    onChangeText={(value) =>
                        setCode(value.replace(nonAlphaNumericChars, ''))
                    }
                    cellCount={env.groupCode.length}
                    textContentType="oneTimeCode"
                    rootStyle={{
                        paddingTop: 128 * 2,
                        paddingBottom: 64,
                        gap: 8,
                    }}
                    renderCell={({ index, symbol, isFocused }) => (
                        <Fragment key={index}>
                            <Text
                                style={[
                                    {
                                        width: isFocused ? 29 : 27,
                                        height: isFocused ? 40 : 38,
                                        margin: isFocused ? 0 : 1,

                                        borderWidth: isFocused ? 2 : 1,
                                        borderColor: isFocused
                                            ? theme.color.text.primary
                                            : theme.color.text.secondary,
                                        borderRadius: 4,

                                        textAlign: 'center',
                                        color: theme.color.text.primary,
                                        fontWeight: 700,
                                        fontSize: 22,
                                        lineHeight: 36,
                                    },
                                ]}
                                onLayout={getCellOnLayoutHandler(index)}
                            >
                                {symbol}
                            </Text>
                            {env.groupCode.seperatorIndices.includes(index) &&
                                seperatorDash}
                        </Fragment>
                    )}
                />
                {isNotFound && (
                    <Text
                        style={{
                            color: theme.color.text.negative,

                            fontSize: 16,
                            fontWeight: 500,

                            marginBottom: 32,
                        }}
                    >
                        Group not found
                    </Text>
                )}
                <Button
                    disabled={isLoading || code.length < env.groupCode.length}
                    variant="primary"
                    size="large"
                    title={isLoading ? <ActivityIndicator /> : 'Join'}
                    onPress={() => onSubmit(code)}
                />
            </SafeAreaView>
        </>
    );
}
