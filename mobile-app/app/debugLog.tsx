import dayjs from 'dayjs';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
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
        // we need to keep this in state because `realtime` is a ref and will not cause a rerender if it changes,
        // so the indicator could be misleading
        setIsRealtimeOpen(realtime.isOpen);
    }, [realtime.isOpen]);

    const theme = useTheme();

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
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

                    paddingTop: insets.top,
                    paddingBottom: insets.bottom + 128,
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
