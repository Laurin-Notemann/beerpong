import React, { useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    TextInput,
    View,
} from 'react-native';

import Text from '@/components/Text';
import { useTheme } from '@/theme';

type Request = {
    title: string;
    message?: string;
    value: number;
    resolve: (value: number | null) => void;
};

// some keyboards type a decimal comma
const toNumber = (text: string | undefined) => {
    const input = (text ?? '').trim().replace(',', '.');
    const value = Number(input);
    if (!input || !Number.isFinite(value)) {
        Alert.alert('Invalid number', 'Enter a number.');
        return null;
    }
    return value;
};

/**
 * Asks for a number: `prompt` resolves with it, or null when cancelled or not
 * a number. iOS shows `Alert.prompt`; Android has no native prompt, so it
 * renders `element`, a dialog like it.
 */
export function useNumberPrompt() {
    const [request, setRequest] = useState<Request>();

    const prompt = (
        title: string,
        message: string | undefined,
        value: number
    ) =>
        new Promise<number | null>((resolve) => {
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    title,
                    message,
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => resolve(null),
                        },
                        {
                            text: 'Save',
                            isPreferred: true,
                            onPress: (text) => resolve(toNumber(text)),
                        },
                    ],
                    'plain-text',
                    String(value),
                    'decimal-pad'
                );
                return;
            }
            setRequest({ title, message, value, resolve });
        });

    const element = request ? (
        <PromptDialog
            request={request}
            onDone={(value) => {
                request.resolve(value);
                setRequest(undefined);
            }}
        />
    ) : null;

    return { prompt, element };
}

function PromptDialog({
    request,
    onDone,
}: {
    request: Request;
    onDone: (value: number | null) => void;
}) {
    const theme = useTheme();
    const [text, setText] = useState(String(request.value));

    return (
        <Modal
            transparent
            animationType="fade"
            onRequestClose={() => onDone(null)}
        >
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: 32,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                }}
            >
                <View
                    style={{
                        gap: 12,
                        padding: 20,
                        borderRadius: 16,
                        backgroundColor: theme.color.modal.bg,
                    }}
                >
                    <Text variant="h5">{request.title}</Text>
                    {request.message && (
                        <Text color="secondary">{request.message}</Text>
                    )}
                    <TextInput
                        autoFocus
                        selectTextOnFocus
                        keyboardType="decimal-pad"
                        keyboardAppearance={theme.keyboardAppearance}
                        value={text}
                        onChangeText={setText}
                        onSubmitEditing={() => onDone(toNumber(text))}
                        style={{
                            fontSize: 17,
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderColor: theme.color.text.secondary,
                            color: theme.color.text.primary,
                        }}
                    />
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            gap: 24,
                            paddingTop: 8,
                        }}
                    >
                        <Pressable
                            style={{
                                minHeight: 44,
                                minWidth: 44,
                                justifyContent: 'center',
                            }}
                            onPress={() => onDone(null)}
                        >
                            <Text color="link">Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={{
                                minHeight: 44,
                                minWidth: 44,
                                justifyContent: 'center',
                            }}
                            onPress={() => onDone(toNumber(text))}
                        >
                            <Text color="link">Save</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
