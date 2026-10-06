import { isAxiosError } from 'axios';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import { useAddTv } from '@/api/calls/tvHooks';
import { env } from '@/api/env';
import { apiErrorCode } from '@/api/utils/apiInterceptors';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useTheme } from '@/theme';
import { showErrorToast } from '@/toast';

/** Puts the group on a Versus TV with the code the TV shows. */
export default function Page() {
    const nav = useNavigation();
    const theme = useTheme();
    const { groupId, group } = useGroup();
    const addTv = useAddTv(groupId);
    const [code, setCode] = useState('');

    async function onSubmit() {
        try {
            const tv = await addTv.mutateAsync(code);
            nav.goBack();
            nav.navigate('tv', { id: tv.id });
        } catch (err) {
            showErrorToast(
                isAxiosError(err) && apiErrorCode(err) === 'tvCodeNotFound'
                    ? 'No TV shows this code.'
                    : "Couldn't add the TV.",
                err
            );
        }
    }

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Add TV' }} />
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button onPress={() => nav.goBack()}>
                    Cancel
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    disabled={code.length < 6 || addTv.isPending}
                    onPress={onSubmit}
                >
                    Add
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                <TextInput
                    required
                    placeholder="Code on the TV"
                    value={code}
                    onChangeText={(text) =>
                        setCode(text.replace(/\s+/g, '').toUpperCase())
                    }
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    maxLength={6}
                    autoFocus
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
                    Open {env.tvBaseUrl.replace(/^https?:\/\//, '')}/tv in the
                    TV&apos;s browser and type the code it shows. Then{' '}
                    {group?.data?.name ?? 'your group'} is on it, and everyone
                    in the group can control it here.
                </Text>
            </InputModal>
        </>
    );
}
