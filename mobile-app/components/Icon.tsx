import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * The app's one icon set. Names: https://pictogrammers.com/library/mdi/
 *
 * Icons are glyphs in a font; hidden from screen readers so rows read as their text, not as
 * private-use characters. Pass `accessibilityElementsHidden={false}` for icon-only buttons
 * (with an `accessibilityLabel`).
 */
export function Icon(props: ComponentProps<typeof MaterialCommunityIcons>) {
    return (
        <MaterialCommunityIcons
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            {...props}
        />
    );
}
