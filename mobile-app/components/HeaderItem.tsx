import { HeaderBackButton } from '@react-navigation/elements';
import React from 'react';
import {
    ActivityIndicator,
    Platform,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableOpacityProps,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme';

export interface HeaderItemProps extends TouchableOpacityProps {
    children?: React.ReactNode;
    noMargin?: boolean;

    onPress?: () => void;

    disabled?: boolean;
    isLoading?: boolean;

    left?: boolean;
    right?: boolean;
    width?: number;

    backButton?: boolean;
}

export const HeaderTitle: React.FC<{ title: string }> = ({ title }) => {
    const theme = useTheme();

    const defaultTextStyle: TextStyle = {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        fontSize: Platform.OS === 'ios' ? 17 : 20,
        fontWeight: Platform.OS === 'ios' ? '600' : '500',
        color: theme.color.text.primary,
    };

    return (
        <Text numberOfLines={1} style={defaultTextStyle}>
            {title}
        </Text>
    );
};

export function HeaderItem({
    children,
    noMargin = false,
    onPress,
    disabled = false,
    isLoading = false,
    left = false,
    right = false,
    backButton = false,
    width,
    ...rest
}: HeaderItemProps) {
    const theme = useTheme();

    return (
        <>
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || isLoading}
                {...rest}
                style={[rest.style, backButton && { marginLeft: -16 }]}
            >
                {isLoading && (
                    <ActivityIndicator
                        style={{
                            paddingTop: 4,

                            marginLeft: right ? 'auto' : undefined,
                        }}
                    />
                )}
                {!isLoading && backButton && (
                    <HeaderBackButton tintColor="white" onPress={onPress} />
                )}
                {!isLoading && !backButton && (
                    <ThemedText
                        style={{
                            marginLeft: noMargin ? 0 : 16,
                            marginRight: noMargin ? 0 : 16,

                            fontWeight: 400,
                            fontSize: 17,
                            letterSpacing: 0.1,
                            color: theme.color.text.primary,

                            opacity: disabled && !isLoading ? 0.2 : undefined,

                            textAlign: right ? 'right' : 'left',

                            width: width ?? '100%',
                        }}
                    >
                        {children}
                    </ThemedText>
                )}
            </TouchableOpacity>
        </>
    );
}
