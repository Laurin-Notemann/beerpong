import { Share } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import copyToClipboard from '@/components/copyToClipboard';
import { showErrorToast } from '@/toast';
import { formatGroupCode } from '@/utils/groupCode';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('group-invite');

/** Copying or sharing the selected group's invite code (header Share menu, group settings). */
export function useGroupInvite() {
    const { group } = useGroup();
    const inviteCode = group?.data?.inviteCode;
    const name = group?.data?.name;

    const withCode = (action: (code: string) => Promise<unknown>) => () => {
        if (!inviteCode) {
            showErrorToast('Group code is not loaded yet.');
            return;
        }
        void action(formatGroupCode(inviteCode)).catch((error: unknown) => {
            logger.error('failed to copy or share the invite', error);
            showErrorToast("Couldn't copy or share the invite.", error);
        });
    };

    return {
        code: inviteCode ? formatGroupCode(inviteCode) : undefined,
        copyCode: withCode((code) => copyToClipboard(code)),
        shareInvite: withCode((code) =>
            Share.share({
                message: `Join ${name ?? 'my group'} on Versus with the code ${code}`,
            })
        ),
    };
}
