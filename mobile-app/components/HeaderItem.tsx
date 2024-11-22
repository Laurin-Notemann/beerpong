import React from 'react';
import { TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/theme';

export function HeaderItem({
    children,
    noMargin = false,
    onPress,
    disabled = false,
}: {
    children: string;
    noMargin?: boolean;

    onPress?: () => void;

    disabled?: boolean;
}) {
    return (
        <>
            <TouchableOpacity onPress={onPress} disabled={disabled}>
                <ThemedText
                    style={{
                        marginLeft: noMargin ? 0 : 16,
                        marginRight: noMargin ? 0 : 16,

                        fontWeight: 400,
                        fontSize: 17,
                        letterSpacing: 0.1,
                        color: theme.color.text.primary,

                        opacity: disabled ? 0.2 : undefined,
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
