import React from 'react';
import { Text, TouchableHighlight, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { theme } from '@/theme';

import ConfirmationModal from '../ConfirmationModal';
import useBoolean from '../useBoolean';

export interface MenuItemProps {
    title: string;
    subtitle?: string;

    type?: 'default' | 'danger';

    headIcon?: string | React.ReactElement;
    tailIconType?: 'copy' | 'next' | 'checked' | 'unchecked';
    onPress?: () => void;

    tailContent?: JSX.Element | string | number;

    color?: 'light' | 'dark'; // | "transparent";

    confirmationPrompt?: {
        title: string;
        description: string;

        buttonText?: string;

        type?: 'confirmBlue' | 'dangerRed';
    };
}
export default function MenuItem({
    title,
    subtitle,
    headIcon,
    tailIconType,

    type = 'default',

    onPress,

    tailContent,

    color = 'light',

    confirmationPrompt,
}: MenuItemProps) {
    const [isPromptShown, showPrompt, hidePrompt] = useBoolean(false);

    return (
        <>
            {confirmationPrompt && isPromptShown && (
                <ConfirmationModal
                    isVisible={isPromptShown}
                    onClose={hidePrompt}
                    title={confirmationPrompt.title}
                    description={confirmationPrompt.description}
                    actions={[
                        {
                            type: (
                                {
                                    dangerRed: 'danger',
                                    confirmBlue: 'confirm',
                                    default: 'default',
                                } as const
                            )[confirmationPrompt.type ?? 'dangerRed'],
                            title: confirmationPrompt.buttonText || 'Delete',
                            onPress: () => {
                                onPress?.();
                                hidePrompt();
                            },
                        },
                        { title: 'Cancel', onPress: hidePrompt },
                    ]}
                />
            )}

            <TouchableHighlight
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',

                    height: subtitle ? undefined : 50,

                    paddingLeft: 16,
                    paddingRight: 9,

                    borderTopWidth: 0.5,
                    borderTopColor: theme.panel[color].dividers,
                }}
                underlayColor={theme.panel[color].active}
                onPress={confirmationPrompt ? showPrompt : onPress}
            >
                <>
                    {headIcon &&
                        (typeof headIcon === 'string' ? (
                            <Icon
                                color={
                                    type === 'danger'
                                        ? theme.color.delete
                                        : theme.icon.primary
                                }
                                size={24}
                                name={headIcon}
                                style={{
                                    paddingRight: 16,
                                }}
                            />
                        ) : (
                            headIcon
                        ))}
                    {subtitle ? (
                        <View
                            style={{
                                paddingRight: 16,
                                paddingVertical: 12,

                                marginRight: 'auto',

                                flex: 1,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 17,
                                    lineHeight: 22,
                                    fontWeight: 400,
                                    color:
                                        type === 'danger'
                                            ? theme.color.delete
                                            : theme.color.text.primary,
                                }}
                                numberOfLines={1}
                            >
                                {title}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    lineHeight: 16,
                                    fontWeight: 400,
                                    color: '#A6A6A6',
                                }}
                            >
                                {subtitle}
                            </Text>
                        </View>
                    ) : (
                        <Text
                            style={{
                                fontSize: 17,
                                lineHeight: 22,
                                fontWeight: 400,
                                color:
                                    type === 'danger'
                                        ? theme.color.delete
                                        : theme.color.text.primary,

                                paddingRight: 16,
                                paddingVertical: 9,

                                marginRight: 'auto',
                            }}
                            numberOfLines={2}
                        >
                            {title}
                        </Text>
                    )}
                    {['number', 'string'].includes(typeof tailContent) ? (
                        <Text
                            style={{
                                fontSize: 17,
                                lineHeight: 22,
                                fontWeight: 400,
                                color: theme.color.text.secondary,

                                flex: 1,

                                textAlign: 'right',
                            }}
                            numberOfLines={1}
                        >
                            {tailContent}
                        </Text>
                    ) : (
                        tailContent
                    )}
                    {tailIconType && (
                        <Icon
                            color={
                                ['checked'].includes(tailIconType)
                                    ? theme.icon.primary
                                    : theme.icon.secondary
                            }
                            size={24}
                            name={
                                {
                                    next: 'chevron-right',
                                    copy: 'content-copy',
                                    checked: 'circle-slice-8', // "check",
                                    unchecked: 'circle-outline',
                                }[tailIconType]
                            }
                        />
                    )}
                </>
            </TouchableHighlight>
        </>
    );
}
