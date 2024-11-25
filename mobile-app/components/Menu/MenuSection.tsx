import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { theme } from '@/theme';

export function Heading({
    title,
    titleHeadIcon,
}: Pick<MenuSectionProps, 'title' | 'titleHeadIcon'>) {
    return (
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
    );
}

export interface MenuSectionProps extends PropsWithChildren {
    title?: JSX.Element | string;
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
        <View>
            {title && <Heading title={title} titleHeadIcon={titleHeadIcon} />}
            <View
                style={{
                    alignItems: 'stretch',
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
            {typeof footer === 'string' ? (
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 13,
                            lineHeight: 16,
                            fontWeight: 400,
                            // color: '#A7A7A7',

                            color: '#6291F3',
                        }}
                    >
                        {footer}
                    </Text>
                </View>
            ) : (
                footer
            )}
        </View>
    );
}
