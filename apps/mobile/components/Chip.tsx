import { Text } from 'react-native';

import { useTheme } from '@/theme';

export interface ChipProps {
    title: string;
    backgroundColor: string;
    color: string;
}
export default function Chip({ title, backgroundColor, color }: ChipProps) {
    return (
        <Text
            style={{
                paddingHorizontal: 2,
                marginBottom: 4,

                backgroundColor,
                color,

                fontSize: 12,
                fontWeight: 700,
                borderRadius: 2,
            }}
        >
            {title}
        </Text>
    );
}

export function HighestChip() {
    const theme = useTheme();

    return (
        <Chip
            title="HIGHEST"
            backgroundColor={theme.color.positive}
            color="#fff"
        />
    );
}
export function LowestChip() {
    const theme = useTheme();

    return (
        <Chip
            title="LOWEST"
            backgroundColor={theme.color.negative}
            color="#fff"
        />
    );
}
export function PremiumChip() {
    const theme = useTheme();

    return (
        <Chip
            title="HIGHEST"
            backgroundColor={theme.color.premium}
            color="#fff"
        />
    );
}
