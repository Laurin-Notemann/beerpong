import { BlurView } from 'expo-blur';
import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

export function Heading({
    title,
    titleHeadIcon,
    titleTailIcon,
}: Pick<MenuSectionProps, 'title' | 'titleHeadIcon' | 'titleTailIcon'>) {
    const theme = useTheme();
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

    noFlex?: boolean;
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

    noFlex = false,
}: MenuSectionProps) {
    const theme = useTheme();

    return (
        <View style={{ flex: noFlex ? undefined : 1 }}>
            {title && (
                <Heading
                    title={title}
                    titleHeadIcon={titleHeadIcon}
                    titleTailIcon={titleTailIcon}
                />
            )}
            <BlurView
                intensity={theme.blur?.intensity ?? 0}
                tint={theme.blur?.tint}
                style={{
                    alignItems: 'stretch',
                    overflow: 'hidden',
                    borderRadius: theme.borderRadius.card,

                    backgroundColor:
                        background === false || !!theme.blur?.intensity
                            ? undefined
                            : theme.panel[color].bg,

                    ...style,
                }}
            >
                {children}
            </BlurView>
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
