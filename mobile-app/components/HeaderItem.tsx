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
import { theme } from '@/theme';

export interface HeaderItemProps extends TouchableOpacityProps {
    children: React.ReactNode;
    noMargin?: boolean;

    onPress?: () => void;

    disabled?: boolean;
    isLoading?: boolean;
}

export const HeaderTitle: React.FC<{ title: string }> = ({ title }) => {
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
    ...rest
}: HeaderItemProps) {
    return (
        <>
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || isLoading}
                {...rest}
            >
                <ThemedText
                    style={{
                        marginLeft: noMargin ? 0 : 16,
                        marginRight: noMargin ? 0 : 16,

                        fontWeight: 400,
                        fontSize: 17,
                        letterSpacing: 0.1,
                        color: theme.color.text.primary,

                        opacity: disabled && !isLoading ? 0.2 : undefined,

                        width: '100%',
                    }}
                >
                    {isLoading ? <ActivityIndicator /> : children}
                </ThemedText>
            </TouchableOpacity>
            {/* <Button
        onPress={() => {}}
        title={children}
        buttonStyle={{
          marginLeft: 16,
          marginRight: 16,
          backgroundColor: "none",
          padding: 0,
        }}
        titleStyle={{
          fontWeight: 400,
          fontSize: 17,
          letterSpacing: 0.1,
          color: theme.color.text.primary,
        }}
      /> */}
        </>
    );
}
