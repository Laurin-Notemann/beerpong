import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { theme } from '@/theme';

export function Heading({
    title,
    titleHeadIcon,
    titleTailIcon,
}: Pick<MenuSectionProps, 'title' | 'titleHeadIcon' | 'titleTailIcon'>) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'flex-end',

                height: 64,
                paddingHorizontal: 8,
                paddingBottom: 12,
            }}
        >
            {titleHeadIcon}
            <Text
                style={{
                    fontSize: 17,
                    lineHeight: 22,
                    fontWeight: 500,
                    color: theme.color.text.primary,

                    marginLeft: titleHeadIcon ? 8 : 0,
                    marginRight: 'auto',
                }}
            >
                {title}
            </Text>
            {titleTailIcon}
        </View>
    );
}

export interface MenuSectionProps extends PropsWithChildren {
    title?: JSX.Element | string;
    titleHeadIcon?: JSX.Element;
    titleTailIcon?: JSX.Element;

    background?: boolean;

    style?: any;

    footer?: string | JSX.Element;

    color?: 'light' | 'dark'; // | "transparent";
}
export default function MenuSection({
    title,
    titleHeadIcon,
    titleTailIcon,

    background,

    style = {},

    children,

    footer,

    color = 'light',
}: MenuSectionProps) {
    return (
        <View style={{ flex: 1 }}>
            {title && (
                <Heading
                    title={title}
                    titleHeadIcon={titleHeadIcon}
                    titleTailIcon={titleTailIcon}
                />
            )}
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

                            color: theme.color.text.primary,
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
