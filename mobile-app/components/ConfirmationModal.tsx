import React from 'react';
import { SafeAreaView, Text, TouchableHighlight, View } from 'react-native';
import Modal from 'react-native-modal';

import { theme } from '@/theme';

export interface ConfirmationModalProps {
    isVisible?: boolean;
    onClose?: () => void;

    title: string;
    description?: string;

    header?: boolean;

    actions: {
        type?: 'default' | 'confirm' | 'danger';
        title: string;
        onPress: () => void;
    }[];
}
export default function ConfirmationModal({
    isVisible = false,
    onClose = () => {},

    title,
    description,

    actions,

    header = true,
}: ConfirmationModalProps) {
    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            style={{ margin: 0 }}
        >
            <SafeAreaView
                style={{
                    backgroundColor: '#3B3B3B',
                    marginTop: 'auto',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    overflow: 'hidden',
                }}
            >
                {header && (
                    <View
                        style={{
                            alignItems: 'center',

                            paddingHorizontal: 16,
                            paddingVertical: 18,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 15,
                                lineHeight: 22,
                                fontWeight: 500,
                                color: theme.color.text.primary,

                                textAlign: 'center',
                            }}
                        >
                            {title}
                        </Text>
                        {description && (
                            <Text
                                style={{
                                    fontSize: 15,
                                    lineHeight: 22,
                                    fontWeight: 400,
                                    color: theme.color.text.primary,

                                    textAlign: 'center',
                                }}
                            >
                                {description}
                            </Text>
                        )}
                    </View>
                )}
                {actions.map((i, idx) => (
                    <TouchableHighlight
                        key={idx}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',

                            height: 61,
                            paddingLeft: 16,
                            paddingRight: 9,

                            marginTop: header ? 0 : idx === 0 ? 18 : 0,

                            borderTopWidth: 0.5,
                            borderBottomWidth:
                                idx === actions.length - 1 ? 0.5 : 0,

                            borderColor: '#4A4A4A',
                        }}
                        underlayColor="#4A4A4A"
                        onPress={i.onPress}
                    >
                        <Text
                            style={{
                                fontSize: 17,
                                lineHeight: 22,
                                fontWeight: 500,
                                color: {
                                    danger: theme.color.delete,
                                    confirm: theme.color.confirm,
                                    default: theme.color.text.primary,
                                }[i.type ?? 'default'],

                                paddingHorizontal: 16,
                                paddingVertical: 9,
                            }}
                        >
                            {i.title}
                        </Text>
                    </TouchableHighlight>
                ))}
            </SafeAreaView>
        </Modal>
    );
}
