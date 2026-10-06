import React from 'react';
import { Text as NativeText, StyleProp, View, ViewStyle } from 'react-native';

import Text from '@/components/Text';
import { useTheme } from '@/theme';
import { formatRatingChange } from '@/utils/format';

/**
 * A player's Elo change in a match (" +12", " −8"), as a span after their name in a line of
 * names. Nothing while it isn't known (e.g. a queued match) or when it rounds to 0.
 */
export function EloChange({ value }: { value: number | undefined }) {
    const theme = useTheme();

    if (value === undefined) return null;
    const text = formatRatingChange(value);
    if (text === '0') return null;

    return (
        <NativeText
            style={{
                color: value > 0 ? theme.color.positive : theme.color.negative,
                fontWeight: '400',
                fontVariant: ['tabular-nums'],
            }}
        >
            {' '}
            {value > 0 ? '+' : '−'}
            {text}
        </NativeText>
    );
}

/**
 * A player's Elo change as a small pill ("+12 Elo", "−8 Elo"), like Versus TV and the widget show
 * it. Nothing while it rounds to 0 or isn't known.
 */
export function EloChangePill({
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
