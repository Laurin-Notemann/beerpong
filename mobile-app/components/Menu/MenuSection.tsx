import { BlurView } from 'expo-blur';
import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

export function Heading({
    title,
    titleHeadIcon,
    titleTailIcon,
    headingSubtitle,
    paragraph = false,
    border = true,
}: Pick<MenuSectionProps, 'title' | 'titleHeadIcon' | 'titleTailIcon'> & {
    headingSubtitle?: string;
    paragraph?: boolean;
    border?: boolean;
}) {
    const theme = useTheme();

    return (
        <View
            style={
                paragraph
                    ? {
                          borderTopWidth: border ? 1 : 0,
                          borderColor: 'rgb(31, 31, 31)',
                          paddingTop: 40,
                          paddingHorizontal: 0,
                          fontSize: 24,
                          lineHeight: 32,

                          flexDirection: 'row',
                          alignItems: 'flex-end',

                          marginTop: 48,
                          marginBottom: 24,
                      }
                    : {
                          flexDirection: 'row',
                          alignItems: 'flex-end',

                          height: 64,
                          paddingHorizontal: 8,
                          paddingBottom: 12,
                      }
            }
        >
            {titleHeadIcon}
            <Text
                selectable={paragraph}
                selectionColor={theme.color.text.emphasis}
                style={
                    paragraph
                        ? {
                              fontSize: 24,
                              lineHeight: 32,
                              color: theme.color.text.primary,

                              fontWeight: '700',
                          }
                        : {
                              fontSize: 17,
                              lineHeight: 22,
                              fontWeight: 500,
                              color: theme.color.text.primary,

                              marginLeft: titleHeadIcon ? 8 : 0,
                              marginRight: 'auto',
                          }
                }
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

    containerStyle?: any;
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

    containerStyle,
}: MenuSectionProps) {
    const theme = useTheme();

    return (
        <View
            style={{ flex: noFlex ? undefined : 1, ...(containerStyle ?? {}) }}
        >
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
