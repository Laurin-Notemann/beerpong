import { Stack } from 'expo-router';
import React from 'react';

import { useGroupInvite } from '@/lib/useGroupInvite';

/** Native header menu (right side) for inviting friends to the selected group. */
export function InviteMenu() {
    const { copyCode, shareInvite } = useGroupInvite();

    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu title="Invite Friends to this Group">
                <Stack.Toolbar.Label>Share</Stack.Toolbar.Label>
                <Stack.Toolbar.MenuAction icon="doc.on.doc" onPress={copyCode}>
                    Copy Group Code
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction
                    icon="square.and.arrow.up"
                    onPress={shareInvite}
                >
                    Share Invite
                </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
