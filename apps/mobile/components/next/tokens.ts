import { useTheme } from '@/theme';

/** Adds an alpha channel to a `#RRGGBB` color. */
export const withAlpha = (hex: string, alpha: number) =>
    hex +
    Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0');

/** Gold, silver and bronze for places 1–3. */
export const medalColors = ['#F2C14E', '#C3CAD5', '#D08B5B'] as const;

/**
 * Design tokens of the experimental redesign ("New Design" in Experimental Features).
 * Derived from the active theme, so light, dark and glossy all work.
 */
export function useNextTokens() {
    const theme = useTheme();
    const isLight = theme.id === 'light';

    return {
        theme,
        isLight,
        radius: 20,
        surface: isLight ? '#FFFFFF' : '#17171A',
        surfacePressed: isLight ? '#ECECF0' : '#232328',
        hairline: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
        text: theme.color.text.primary,
        textSecondary: theme.color.text.secondary,
        blue: theme.color.team.blue,
        red: theme.color.team.red,
        blueTint: withAlpha(theme.color.team.blue, isLight ? 0.12 : 0.16),
        redTint: withAlpha(theme.color.team.red, isLight ? 0.12 : 0.16),
    };
}
