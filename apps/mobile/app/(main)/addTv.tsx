import { isAxiosError } from 'axios';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import { useAddCamera, useAddTv, usePhoneCamera } from '@/api/calls/tvHooks';
import { env } from '@/api/env';
import { apiErrorCode } from '@/api/utils/apiInterceptors';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { Card, Row } from '@/components/tvRemote/RemoteParts';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useTheme } from '@/theme';
import { showErrorToast } from '@/toast';

/**
 * Puts the group on a Versus TV with the code the TV shows; with `kind: 'camera'` on a camera
 * (`/tv/camera`), whose video the TVs can show.
 */
export default function Page() {
    const nav = useNavigation();
    const theme = useTheme();
    const { kind } = useLocalSearchParams<{ kind?: 'camera' }>();
    const camera = kind === 'camera';
    const { groupId, group } = useGroup();
    const addTv = useAddTv(groupId);
    const addCamera = useAddCamera(groupId);
    const phoneCamera = usePhoneCamera(groupId);
    const pending = addTv.isPending || addCamera.isPending;
    const [code, setCode] = useState('');
    const groupName = group?.data?.name ?? 'your group';
    const host = env.tvBaseUrl.replace(/^https?:\/\//, '');

    async function onSubmit() {
        try {
            if (camera) {
                await addCamera.mutateAsync(code);
                nav.goBack();
                return;
            }
            const tv = await addTv.mutateAsync(code);
            nav.goBack();
            nav.navigate('tv', { id: tv.id });
        } catch (err) {
            const notFound =
                isAxiosError(err) &&
                ['tvCodeNotFound', 'cameraCodeNotFound'].includes(
                    apiErrorCode(err) ?? ''
                );
            showErrorToast(
                notFound
                    ? `No ${camera ? 'camera' : 'TV'} shows this code.`
                    : `Couldn't add the ${camera ? 'camera' : 'TV'}.`,
                err
            );
        }
    }

    return (
        <>
            <Stack.Screen
                options={{ headerTitle: camera ? 'Add Camera' : 'Add TV' }}
            />
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button onPress={() => nav.goBack()}>
                    Cancel
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    disabled={code.length < 6 || pending}
                    onPress={onSubmit}
                >
                    Add
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                {camera && (
                    <Card>
                        <Row
                            icon="cellphone"
                            title={
                                phoneCamera.isPending
                                    ? 'Opening camera…'
                                    : 'Use this phone'
                            }
                            subtitle="Opens your camera in the browser, already paired"
                            onPress={() => {
                                if (!phoneCamera.isPending)
                                    phoneCamera.mutate();
                            }}
                        />
                    </Card>
                )}

                <TextInput
                    required
                    placeholder={
                        camera ? 'Code on the camera' : 'Code on the TV'
                    }
                    value={code}
                    onChangeText={(text) =>
                        setCode(text.replace(/\s+/g, '').toUpperCase())
                    }
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    maxLength={6}
                    autoFocus={!camera}
                    returnKeyType="done"
                    onSubmitEditing={() => code.length === 6 && onSubmit()}
                    style={{ alignSelf: 'stretch' }}
                />
                <Text
                    style={{
                        color: theme.color.text.secondary,
                        fontSize: 13,
                        lineHeight: 18,
                    }}
                >
                    {camera
                        ? `Open ${host}/tv/camera in the browser of a laptop or phone at the table and type the code it shows. Then its video can go on ${groupName}'s TVs: choose Camera on a TV here.`
                        : `Open ${host}/tv in the TV's browser and type the code it shows. Then ${groupName} is on it, and everyone in the group can control it here.`}
                </Text>
            </InputModal>
        </>
    );
}
