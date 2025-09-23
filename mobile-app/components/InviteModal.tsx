import { useGroup } from '@/api/calls/seasonHooks';
import ConfirmationModal from '@/components/ConfirmationModal';
import copyToClipboard from '@/components/copyToClipboard';
import { showErrorToast } from '@/toast';
import { formatGroupCode } from '@/utils/groupCode';

export function InviteModal({
    onClose,
    isVisible,
}: {
    onClose: () => void;
    isVisible: boolean;
}) {
    const { group } = useGroup();

    return (
        <ConfirmationModal
            onClose={onClose}
            title="Invite Friends to this Group"
            actions={
                [
                    {
                        title: 'Copy Group Code',

                        onPress: () => {
                            if (!group.data?.inviteCode) {
                                showErrorToast('Failed to copy group code.');
                                return;
                            }
                            copyToClipboard(
                                formatGroupCode(group.data.inviteCode)
                            );
                            onClose();
                        },
                    },
                ] as const
            }
            isVisible={isVisible}
        />
    );
}
