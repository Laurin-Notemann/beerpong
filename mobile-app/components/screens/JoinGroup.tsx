import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import React, { Fragment, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    SafeAreaView,
    Text,
} from 'react-native';
import {
    CodeField,
    useBlurOnFulfill,
    useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { env } from '@/api/env';
import Button from '@/components/Button';
import { useAutoFocus } from '@/components/screens/useAutoFocus';
import { useTheme } from '@/theme';
import { showSuccessToast } from '@/toast';

const nonAlphaNumericChars = /[^a-zA-Z0-9]/g;

const SeperatorDash = () => {
    const theme = useTheme();

    return (
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
};

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
    const [codeFromClipboard, setCodeFromClipboard] = useState('');

    const ref = useBlurOnFulfill({
        value: code,
        cellCount: env.groupCode.length,
    });
    useAutoFocus(ref);

    const [props, getCellOnLayoutHandler] = useClearByFocusCell({
        value: code,
        setValue: (value) => setCode(value.toUpperCase()),
    });

    useEffect(() => {
        // auto submit when the user has entered the full code
        if (
            code.length === env.groupCode.length &&
            code !== codeFromClipboard
        ) {
            onSubmit(code);
        }
    }, [code, onSubmit]);

    const handlePaste = async () => {
        const clipboardContents = await Clipboard.getStringAsync();
        const withoutWhitespace = clipboardContents
            .replace(/\s/g, '')
            .toUpperCase();
        if (
            withoutWhitespace.length !== env.groupCode.length ||
            !withoutWhitespace.match(/^[a-zA-Z0-9]+$/)
        ) {
            return;
        }
        setCodeFromClipboard(withoutWhitespace);
        setCode(withoutWhitespace);

        showSuccessToast('Filled in from clipboard');
    };

    useEffect(() => {
        handlePaste();
    }, []);

    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Join Group',
                    headerBackTitleVisible: false,
                    headerBackVisible: true,
                    headerTintColor: theme.color.text.primary,

                    headerStyle: {
                        backgroundColor: theme.color.topNav,
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
                <KeyboardAvoidingView>
                    <CodeField
                        ref={ref}
                        {...props}
                        value={code}
                        onChangeText={(value) =>
                            setCode(
                                value
                                    .replace(nonAlphaNumericChars, '')
                                    .toUpperCase()
                            )
                        }
                        cellCount={env.groupCode.length}
                        textContentType="oneTimeCode"
                        rootStyle={{
                            paddingTop: 128 * 2,
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
                                {env.groupCode.seperatorIndices.includes(
                                    index
                                ) && <SeperatorDash />}
                            </Fragment>
                        )}
                    />
                    <TouchableOpacity
                        onPress={() => setCode('')}
                        style={{
                            paddingTop: 16,
                        }}
                    >
                        <Text
                            style={{
                                color: theme.color.text.secondary,

                                fontSize: 16,
                                fontWeight: 500,

                                marginBottom: 32,

                                opacity: isLoading || code.length < 1 ? 0 : 1,
                            }}
                        >
                            Clear
                        </Text>
                    </TouchableOpacity>
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
                        disabled={
                            isLoading || code.length < env.groupCode.length
                        }
                        variant="primary"
                        size="large"
                        title={isLoading ? <ActivityIndicator /> : 'Join'}
                        onPress={() => onSubmit(code)}
                    />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
}
