import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import copyToClipboard from '@/components/copyToClipboard';
import { DebugScreen } from '@/components/debug/DebugScreen';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { showSuccessToast } from '@/toast';

const formatSize = (chars: number) =>
    chars > 1024 ? `${(chars / 1024).toFixed(1)} KB` : `${chars} B`;

export default function Page() {
    const entries = useQuery({
        queryKey: ['debug', 'asyncStorage'],
        gcTime: 0,
        queryFn: async () => {
            const keys = await AsyncStorage.getAllKeys();
            const values = await AsyncStorage.getMany(keys);
            return Object.entries(values)
                .map(([key, value]) => ({ key, value: value ?? '' }))
                .sort((a, b) => a.key.localeCompare(b.key));
        },
    });

    return (
        <DebugScreen title="Storage">
            <MenuSection
                title={`AsyncStorage (${entries.data?.length ?? 0} keys)`}
                footer="Tap to copy a value. Deleting can sign you out of features or reset settings."
            >
                {entries.data?.map((entry, idx) => (
                    <MenuItem
                        key={entry.key}
                        border={idx > 0}
                        title={entry.key}
                        subtitle={`${formatSize(entry.value.length)} · ${entry.value.slice(0, 80)}`}
                        onPress={() => copyToClipboard(entry.value)}
                        tailIconType="copy"
                    />
                ))}
            </MenuSection>
            <MenuSection title="Delete">
                {entries.data?.map((entry, idx) => (
                    <MenuItem
                        key={entry.key}
                        border={idx > 0}
                        type="danger"
                        title={`Delete ${entry.key}`}
                        confirmationPrompt={{
                            title: `Delete ${entry.key}?`,
                            description:
                                'The app may need a restart to pick this up.',
                            buttonText: 'Delete',
                            type: 'dangerRed',
                        }}
                        onPress={async () => {
                            await AsyncStorage.removeItem(entry.key);
                            await entries.refetch();
                            showSuccessToast(`Deleted ${entry.key}`);
                        }}
                    />
                ))}
            </MenuSection>
        </DebugScreen>
    );
}
