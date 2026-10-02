import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import React, { Fragment, useEffect, useEffectEvent, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    SafeAreaView,
    Text,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
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
import { showErrorToast, showSuccessToast } from '@/toast';

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
    joinGroupError?: Error | null;
    isLoading?: boolean;
    isNotFound?: boolean;

    onSubmit: (code: string) => void;
}
export default function JoinGroup({
    joinGroupError,
    onSubmit,
    isLoading = false,
    isNotFound = false,
}: JoinGroupProps) {
    const [code, setCode] = useState('');

    // auto-submits the code when the user types it in
    function onCodeChange(value: string, isFromClipboard = false) {
        const cleanedValue = value
            .replace(nonAlphaNumericChars, '')
            .toUpperCase();
        setCode(cleanedValue);

        // don't auto-submit if the code is being filled from clipboard, which might confuse the user
        if (isFromClipboard) {
            return;
        }
        const isValidCode = cleanedValue.length === env.groupCode.length;

        if (isValidCode) {
            onSubmit(cleanedValue);
        }
    }
    function onResetCode() {
        codeInput()?.focus();
        onCodeChange('');
    }

    const codeInputRef = useBlurOnFulfill({
        value: code,
        cellCount: env.groupCode.length,
    });
    // react-native-confirmation-code-field still types its ref as the pre-0.88 TextInput class.
    const codeInput = () =>
        codeInputRef.current as unknown as TextInputInstance | null;
    useAutoFocus(
        codeInputRef as unknown as React.RefObject<TextInputInstance | null>
    );

    const [props, getCellOnLayoutHandler] = useClearByFocusCell({
        value: code,
        setValue: onCodeChange,
    });

    const fillFromClipboard = (clipboardContents: string) => {
        const withoutWhitespace = clipboardContents
            .replace(nonAlphaNumericChars, '')
            .toUpperCase();
        if (
            withoutWhitespace.length !== env.groupCode.length ||
            !withoutWhitespace.match(/^[a-zA-Z0-9]+$/)
        ) {
            return false;
        }
        onCodeChange(withoutWhitespace, true);

        showSuccessToast('Filled in from clipboard');
        return true;
    };
    const fillFromClipboardOnOpen = useEffectEvent(fillFromClipboard);

    // Reading the clipboard on iOS asks for permission every time; the system paste button
    // below doesn't. Android reads without asking, so it fills the code in right away.
    useEffect(() => {
        if (Clipboard.isPasteButtonAvailable) return;
        Clipboard.getStringAsync().then((contents) =>
            fillFromClipboardOnOpen(contents)
        );
    }, []);

    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Join Group',
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
                        ref={codeInputRef}
                        {...props}
                        value={code}
                        onChangeText={(value) => onCodeChange(value)}
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
                    {Clipboard.isPasteButtonAvailable && code.length === 0 && (
                        <Clipboard.ClipboardPasteButton
                            acceptedContentTypes={['plain-text']}
                            displayMode="iconAndLabel"
                            onPress={(data) => {
                                if (
                                    data.type !== 'text' ||
                                    !fillFromClipboard(data.text)
                                ) {
                                    showErrorToast(
                                        "The clipboard doesn't contain a group code."
                                    );
                                }
                            }}
                            style={{
                                alignSelf: 'center',
                                width: 110,
                                height: 40,
                                marginTop: 16,
                            }}
                        />
                    )}
                    <TouchableOpacity
                        onPress={onResetCode}
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
                    {joinGroupError && (
                        <Text
                            style={{
                                color: theme.color.text.negative,

                                fontSize: 16,
                                fontWeight: 500,

                                marginBottom: 32,
                            }}
                        >
                            {isNotFound
                                ? 'Group not found'
                                : 'Error: ' +
                                  (joinGroupError.message ||
                                      'An unknown error occured')}
                        </Text>
                    )}
                    <Button
                        disabled={
                            isLoading || code.length < env.groupCode.length
                        }
                        variant="primary"
                        size="large"
                        title={
                            isLoading ? (
                                <ActivityIndicator />
                            ) : isNotFound ? (
                                'Retry'
                            ) : (
                                'Join Group'
                            )
                        }
                        onPress={() => onSubmit(code)}
                    />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
}
