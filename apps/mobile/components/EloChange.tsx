import { Text } from 'react-native';

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
        <Text
            style={{
                color: value > 0 ? theme.color.positive : theme.color.negative,
                fontWeight: '400',
                fontVariant: ['tabular-nums'],
            }}
        >
            {' '}
            {value > 0 ? '+' : '−'}
            {text}
        </Text>
    );
}
