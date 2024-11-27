import dayjs from 'dayjs';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useApi } from '@/api/utils/create-api';
import { navStyles } from '@/app/navigation/navStyles';
import { Heading } from '@/components/Menu/MenuSection';
import Text from '@/components/Text';
import { theme } from '@/theme';
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

    useEffect(() => {
        // we need to keep this in state because `realtime` is a ref and will not cause a rerender if it changes,
        // so the indicator could be misleading
        setIsRealtimeOpen(realtime.isOpen);
    }, [realtime.isOpen]);

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Debug Logs',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
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
                <Heading title="Debug Logs" />
                {logs.map((i, idx) => (
                    <Text color="primary" key={idx} style={{ fontSize: 12 }}>
                        <Text color="secondary" style={{ fontSize: 12 }}>
                            {dayjs(i.date).format('HH:mm:ss')}{' '}
                        </Text>
                        {stringifyLogs(i.data)}
                    </Text>
                ))}
            </ScrollView>
        </GestureHandlerRootView>
    );
}
