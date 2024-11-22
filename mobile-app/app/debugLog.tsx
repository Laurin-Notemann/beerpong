import dayjs from 'dayjs';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { env } from '@/api/env';
import { useApi } from '@/api/utils/create-api';
import { navStyles } from '@/app/navigation/navStyles';
import { Heading } from '@/components/Menu/MenuSection';
import Text from '@/components/Text';
import { theme } from '@/theme';
import { Logs } from '@/utils/logging';

export default function Page() {
    const { realtime } = useApi();

    const [logs, setLogs] = useState<{ data: Logs; time: Date }[]>([]);

    function writeLogs(...data: Logs) {
        setLogs((prev) => [...prev, { data, time: new Date() }]);
    }

    useEffect(() => {
        realtime.logger.addEventListener('*', writeLogs);

        return () => realtime.logger.removeEventListener('*', writeLogs);
    }, [realtime]);

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
                <Heading title="Debug Logs" />
                {logs.map((i, idx) => (
                    <Text color="primary" key={idx}>
                        <Text color="secondary" key={idx}>
                            {env.format.date.matchHour(dayjs(i.time))}{' '}
                        </Text>
                        {i.data.join(' ')}
                    </Text>
                ))}
            </ScrollView>
        </GestureHandlerRootView>
    );
}
