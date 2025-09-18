import {
    Text as ReactNativeText,
    TextProps as ReactNativeTextProps,
} from 'react-native';

import { Theme, useTheme } from '@/theme';

const fontSizeMap = {
    h1: 32, // Large header for primary titles
    h2: 28, // Secondary header for section titles
    h3: 24, // Subsection header or important headings
    h4: 20, // Medium header for lesser headings
    h5: 18, // Small header for subtle sections
    h6: 16, // Smaller header, can also be used for labels
    subtitle1: 16, // Main subtitles, typically under headers
    subtitle2: 14, // Secondary subtitles or minor captions
    body1: 16, // Main body text, normal content
    body2: 14, // Secondary body text, less important content
    fineprint: 12,
};

export interface TextProps extends ReactNativeTextProps {
    variant?: keyof typeof fontSizeMap;
    bold?: boolean;

    color?: keyof Theme['color']['text'];

    code?: boolean;
    italic?: boolean;
    paragraph?: boolean;
}
export default function Text({
    paragraph = false,
    children,
    italic = false,
    variant = 'body1',
    color = 'primary',
    bold = false,

    code = false,
    ...rest
}: TextProps) {
    const theme = useTheme();

    return (
        <ReactNativeText
            {...rest}
            style={{
                fontSize: fontSizeMap[variant],
                color: code ? theme.textEmphasis : theme.color.text[color],
                fontWeight: bold || code ? 'bold' : undefined,

                fontStyle: italic ? 'italic' : 'normal',

                lineHeight: paragraph ? 28 : undefined,

                ...((rest.style as Record<string, string>) ?? {}),
            }}
        >
            {children}
        </ReactNativeText>
    );
}
