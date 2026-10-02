import { Stack } from 'expo-router';
import React, { PropsWithChildren } from 'react';
import { ScrollView } from 'react-native';

import copyToClipboard from '@/components/copyToClipboard';
import MenuItem from '@/components/Menu/MenuItem';
import { AppBackground } from '@/lib/Background';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useInsets } from '@/lib/useInsets';

/** Layout shared by the internal debug screens (Settings → Debug). */
export function DebugScreen({
    title,
    children,
}: PropsWithChildren<{ title: string }>) {
    const insets = useInsets(true);

    return (
        <>
            <Stack.Screen options={{ ...useNavStyles(), headerTitle: title }} />
            <AppBackground />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingHorizontal: 16,
                    paddingBottom: insets.bottom + 128,
                }}
            >
                {children}
            </ScrollView>
        </>
    );
}

const format = (value: unknown) =>
    value === null || value === undefined || value === ''
        ? '–'
        : typeof value === 'string'
          ? value
          : JSON.stringify(value);

/** A label/value row; tapping copies the value. */
export function DebugRow({
    label,
    value,
    first = false,
}: {
    label: string;
    value: unknown;
    first?: boolean;
}) {
    const text = format(value);

    return (
        <MenuItem
            border={!first}
            title={label}
            subtitle={text}
            tailIconType="copy"
            onPress={() => copyToClipboard(text)}
        />
    );
}
