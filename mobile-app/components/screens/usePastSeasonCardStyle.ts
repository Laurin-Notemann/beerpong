import { ViewStyle } from 'react-native';

import { useInsets } from '@/lib/useInsets';
import { useTheme } from '@/theme';

/** The card each past season (leaderboard and matches) is shown on, one per swiper page. */
export function usePastSeasonCardStyle(): ViewStyle {
    const theme = useTheme();
    const insets = useInsets(true, true);

    return {
        marginTop: insets.top,
        marginBottom: insets.bottom + 8,
        marginHorizontal: 12,
        borderRadius: theme.borderRadius.card,
        backgroundColor: theme.color.modal.bg,
    };
}
