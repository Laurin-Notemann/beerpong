import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/theme';

export interface HeaderItemProps extends TouchableOpacityProps {
    children: React.ReactNode;
    noMargin?: boolean;

    onPress?: () => void;

    disabled?: boolean;
}

export function HeaderItem({
    children,
    noMargin = false,
    onPress,
    disabled = false,
    ...rest
}: HeaderItemProps) {
    return (
        <>
            <TouchableOpacity onPress={onPress} disabled={disabled} {...rest}>
                <ThemedText
                    style={{
                        marginLeft: noMargin ? 0 : 16,
                        marginRight: noMargin ? 0 : 16,

                        fontWeight: 400,
                        fontSize: 17,
                        letterSpacing: 0.1,
                        color: theme.color.text.primary,

                        opacity: disabled ? 0.2 : undefined,

                        width: '100%',
                    }}
                >
                    {children}
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
