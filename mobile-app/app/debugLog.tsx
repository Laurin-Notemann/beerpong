import { LegendList } from '@legendapp/list/react-native';
import dayjs from 'dayjs';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useApi } from '@/api/utils/create-api';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useInsets } from '@/app/useInsets';
import copyToClipboard from '@/components/copyToClipboard';
import { Heading } from '@/components/Menu/MenuSection';
import Text from '@/components/Text';
import { useTheme } from '@/theme';
import { Logs } from '@/utils/logging';
import { useLogging } from '@/utils/useLogging';

function stringifyLogs(logs: Logs): string {
    const strLogs = logs.map((value) => {
        if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
        ) {
            return String(value);
        }
        return JSON.stringify(value);
    });
    return strLogs.join(' ');
}

export default function Page() {
    const { logs } = useLogging();

    const [isRealtimeOpen, setIsRealtimeOpen] = useState(false);

    const { realtime } = useApi();

    const insets = useInsets(true);

    useEffect(() => {
        // the socket isn't React state, so poll it
        const update = () => setIsRealtimeOpen(realtime?.isOpen ?? false);
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [realtime]);

    const theme = useTheme();

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Debug Logs',
                }}
            />
            <LegendList
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    paddingTop: insets.top,
                    paddingBottom: insets.bottom + 128,
                }}
                ListHeaderComponent={
                    <>
                        <Heading
                            title={
                                <>
                                    Web Socket{' '}
                                    {isRealtimeOpen
                                        ? 'connected ✅'
                                        : 'disconnected ❌'}
                                </>
                            }
                        />
                        <Heading
                            title="Debug Logs"
                            titleTailIcon={
                                <TouchableOpacity
                                    onPress={() =>
                                        copyToClipboard(JSON.stringify(logs))
                                    }
                                >
                                    <Icon
                                        color={theme.color.text.primary}
                                        name="content-copy"
                                        size={16}
                                    />
                                </TouchableOpacity>
                            }
                        />
                    </>
                }
                data={logs}
                // logs are append-only, so the index is a stable key
                keyExtractor={(_, idx) => String(idx)}
                estimatedItemSize={16}
                recycleItems
                renderItem={({ item }) => (
                    <Text color="primary" style={{ fontSize: 12 }}>
                        <Text color="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.date).format('HH:mm:ss')}{' '}
                        </Text>
                        {stringifyLogs(item.data)}
                    </Text>
                )}
            />
        </GestureHandlerRootView>
    );
}
