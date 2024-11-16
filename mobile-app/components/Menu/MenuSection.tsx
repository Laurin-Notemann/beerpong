import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { theme } from '@/theme';

export interface MenuSectionProps extends PropsWithChildren {
    title?: string;
    titleHeadIcon?: JSX.Element;

    background?: boolean;

    style?: any;

    footer?: string | JSX.Element;

    color?: 'light' | 'dark'; // | "transparent";
}
export default function MenuSection({
    title,
    titleHeadIcon,

    background,

    style = {},

    children,

    footer,

    color = 'light',
}: MenuSectionProps) {
    return (
        <>
            {title && (
                <View
                    style={{
                        height: 64,
                        paddingHorizontal: 8,
                        paddingBottom: 12,

                        justifyContent: 'flex-end',
                    }}
                >
                    {titleHeadIcon}
                    <Text
                        style={{
                            fontSize: 17,
                            lineHeight: 22,
                            fontWeight: 500,
                            color: '#e9e9e9',

                            marginLeft: titleHeadIcon ? 8 : 0,
                            marginRight: 'auto',
                        }}
                    >
                        {title}
                    </Text>
                </View>
            )}
            <View
                style={{
                    overflow: 'hidden',
                    borderRadius: 10,

                    backgroundColor:
                        background === false
                            ? undefined
                            : theme.panel[color].bg,

                    ...style,
                }}
            >
                {children}
            </View>
            {footer && (
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                    }}
                >
                    {typeof footer === 'string' ? (
                        <Text
                            style={{
                                fontSize: 13,
                                lineHeight: 16,
                                fontWeight: 400,
                                color: '#A7A7A7',
                            }}
                        >
                            {footer}
                        </Text>
                    ) : (
                        footer
                    )}
                </View>
            )}
        </>
    );
}
