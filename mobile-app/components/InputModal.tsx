import { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { theme } from '@/theme';

export interface InputModalProps extends PropsWithChildren {
    isDark?: boolean;
}
export default function InputModal({
    children,
    isDark = false,
}: InputModalProps) {
    return (
        <View
            style={{
                alignItems: 'stretch',
                gap: 32,

                flex: 1,
                paddingHorizontal: 16,
                paddingTop: 20,

                backgroundColor: isDark ? theme.color.bg : theme.panel.dark.bg,
            }}
        >
            {children}
        </View>
    );
}
