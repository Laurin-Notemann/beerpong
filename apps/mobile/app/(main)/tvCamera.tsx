import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useIsFocused, usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';

import { usePhoneCamera } from '@/api/calls/tvHooks';
import Button from '@/components/Button';
import { PhoneCameraFeed } from '@/components/tvRemote/PhoneCameraFeed';
import type { PhoneCameraFeedHandle } from '@/components/tvRemote/PhoneCameraFeed.types';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useInsets } from '@/lib/useInsets';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('phone-camera');

export default function Page() {
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const nav = useNavigation();
    const focused = useIsFocused();
    const insets = useInsets();
    const { mutate, data: url, isError, isPending } = usePhoneCamera(groupId);
    const feed = useRef<PhoneCameraFeedHandle>(null);
    const leave = useRef<(() => void) | null>(null);
    const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    );
    const [closing, setClosing] = useState(false);
    const [failed, setFailed] = useState(false);
    const [active, setActive] = useState(
        AppState.currentState !== 'background'
    );

    useEffect(() => {
        mutate('app');
    }, [mutate]);
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            // iOS also goes inactive for its permission prompt; only background pauses capture.
            if (state === 'background') setActive(false);
            if (state === 'active') setActive(true);
        });
        return () => subscription.remove();
    }, []);
    useEffect(() => () => clearTimeout(timeout.current), []);

    const stopped = () => {
        clearTimeout(timeout.current);
        const repeat = leave.current;
        leave.current = null;
        repeat?.();
    };
    usePreventRemove(!!url && !failed, ({ repeat }) => {
        if (leave.current) return;
        leave.current = repeat;
        setClosing(true);
        feed.current?.stop();
        // A crashed/offline web view must not trap the user. Unmount also releases its camera.
        timeout.current = setTimeout(() => {
            logger.warn('Camera did not acknowledge stop before leaving');
            stopped();
        }, 5_000);
    });

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Phone Camera',
                    headerTransparent: false,
                    orientation: 'all',
                }}
            />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    disabled={closing}
                    onPress={() => nav.goBack()}
                >
                    {closing ? 'Stopping…' : 'Stop'}
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <View
                style={{
                    flex: 1,
                    backgroundColor: '#000',
                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                }}
            >
                {focused && <KeepScreenOn />}
                {isPending && <ActivityIndicator style={{ flex: 1 }} />}
                {(isError || failed) && (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 16,
                            padding: 24,
                        }}
                    >
                        <Text style={{ color: '#fff', textAlign: 'center' }}>
                            Couldn't open the camera. Check your connection and
                            camera permission, then try again.
                        </Text>
                        <Button
                            title="Try again"
                            onPress={() => {
                                setFailed(false);
                                mutate('app');
                            }}
                        />
                    </View>
                )}
                {url && !isPending && !failed && !isError && focused && (
                    <PhoneCameraFeed
                        ref={feed}
                        url={url}
                        active={active}
                        onStopped={stopped}
                        onFailure={() => {
                            logger.warn('In-app camera page failed to load');
                            setFailed(true);
                        }}
                    />
                )}
            </View>
        </>
    );
}

function KeepScreenOn() {
    useKeepAwake('phone-camera');
    return null;
}
