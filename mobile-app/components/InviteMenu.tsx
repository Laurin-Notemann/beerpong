import { Stack } from 'expo-router';
import React from 'react';
import { Share } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import copyToClipboard from '@/components/copyToClipboard';
import { showErrorToast } from '@/toast';
import { formatGroupCode } from '@/utils/groupCode';

/** Native header menu (right side) for inviting friends to the selected group. */
export function InviteMenu() {
    const { group } = useGroup();
    const inviteCode = group.data?.inviteCode;
    const name = group.data?.name;

    const withCode = (action: (code: string) => void) => () => {
        if (!inviteCode) {
            showErrorToast('Group code is not loaded yet.');
            return;
        }
        action(formatGroupCode(inviteCode));
    };

    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu
                icon="person.badge.plus"
                title="Invite Friends to this Group"
            >
                <Stack.Toolbar.MenuAction
                    icon="doc.on.doc"
                    onPress={withCode((code) => copyToClipboard(code))}
                >
                    Copy Group Code
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction
                    icon="square.and.arrow.up"
                    onPress={withCode((code) =>
                        Share.share({
                            message: `Join ${name ?? 'my group'} on Versus with the code ${code}`,
                        })
                    )}
                >
                    Share Invite
                </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
