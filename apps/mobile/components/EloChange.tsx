import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import Text from '@/components/Text';
import { useTheme } from '@/theme';

/**
 * A player's Elo change as a small pill ("+12 Elo", "−8 Elo"), like Versus TV and the widget show
 * it. Nothing while it rounds to 0 or isn't known.
 */
export function EloChange({
    value,
    style,
}: {
    value: number | undefined;
    style?: StyleProp<ViewStyle>;
}) {
    const theme = useTheme();
    const rounded = Math.round(value ?? 0);
    if (!rounded) return null;

    const color = rounded > 0 ? theme.color.positive : theme.color.negative;
    return (
        <View
            style={[
                {
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: color + '26',
                },
                style,
            ]}
        >
            <Text
                variant="body2"
                style={{
                    color,
                    fontWeight: '600',
                    fontVariant: ['tabular-nums'],
                }}
            >
                {rounded > 0 ? '+' : '−'}
                {Math.abs(rounded)} Elo
            </Text>
        </View>
    );
}
