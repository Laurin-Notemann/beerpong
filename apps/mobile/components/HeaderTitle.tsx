import React from 'react';
import { Platform, Text, TextStyle } from 'react-native';

import { useTheme } from '@/theme';

/** Text styled like the platform's native header title, for custom `headerTitle` views. */
export const HeaderTitle: React.FC<{ title: string }> = ({ title }) => {
    const theme = useTheme();

    const defaultTextStyle: TextStyle = {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        fontSize: Platform.OS === 'ios' ? 17 : 20,
        fontWeight: Platform.OS === 'ios' ? '600' : '500',
        color: theme.color.text.primary,
    };

    return (
        <Text numberOfLines={1} style={defaultTextStyle}>
            {title}
        </Text>
    );
};
