import React from 'react';
import { Text, TouchableHighlight } from 'react-native';

import CupGrid from '@/components/CupGrid';
import { FormationType } from '@/components/CupGrid/Formation';
import { useTheme } from '@/theme';

/** a formation to pick or edit: its cups and its name */
export function FormationTile({
    name,
    formation,
    color,
    size,
    selected = false,
    onPress,
}: {
    name: string;
    formation: FormationType;
    color?: string;
    size: number;
    selected?: boolean;
    onPress: () => void;
}) {
    const theme = useTheme();

    return (
        <TouchableHighlight
            style={{
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: size,
                height: size,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: selected
                    ? (color ?? theme.color.text.primary)
                    : 'transparent',
                backgroundColor: theme.panel.light.bg,
            }}
            underlayColor={theme.panel.dark.active}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
        >
            <>
                <CupGrid
                    width={size * 0.55}
                    color={color}
                    formation={formation}
                />
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 14,
                        color: theme.color.text.primary,
                        paddingHorizontal: 6,
                    }}
                >
                    {name}
                </Text>
            </>
        </TouchableHighlight>
    );
}
