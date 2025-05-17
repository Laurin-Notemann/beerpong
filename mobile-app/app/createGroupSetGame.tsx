import React from 'react';

import { useCreateGroupMutation } from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { CreateGroupSetGame } from '@/components/screens/CreateGroupSetGame';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export default function Page() {
    const nav = useNavigation();
    const { members, name } = useCreateGroupStore();
    const createGroupMutation = useCreateGroupMutation();
    const { addGroup } = useGroupStore();

    async function createGroup() {
        if (!name) return;

        try {
            const data = await createGroupMutation.mutateAsync({
                name,
                profileNames: members.map((m) => m.name),
            });
            if (!data?.data?.id) {
                throw new Error('invalid create group response');
            }
            addGroup(data.data.id);

            showSuccessToast(`You created "${name}"`);

            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to create group:', err);
            showErrorToast('Failed to create group.');
        }
    }

    return (
        <CreateGroupSetGame
            games={[
                {
                    id: 'beerpong',
                    title: 'Beerpong',
                    icon: '',
                    imageUrl:
                        'https://www.shutterstock.com/image-photo/cups-plastic-ball-beer-pong-600nw-1107685832.jpg',
                },
                {
                    id: 'kicker',
                    title: 'Kicker',
                    icon: '',
                    imageUrl:
                        'https://media.istockphoto.com/id/696594232/photo/foosball-at-modern-office-close-up-view.jpg?s=612x612&w=0&k=20&c=skF0hp5i_9ctZ2MmkqLdaOklvwSGbqEqcAu0JLF8M5c=',
                },
                {
                    id: 'tabletennis',
                    title: 'Table Tennis',
                    icon: '',
                    imageUrl:
                        'https://media.istockphoto.com/id/1425158165/photo/table-tennis-ping-pong-paddles-and-white-ball-on-blue-board.jpg?s=612x612&w=0&k=20&c=KSdi4bEGoxdhaGMnl6CZaqTLbKbobArgrrpLem3oN98=',
                },
                {
                    id: 'chess',
                    title: 'Chess',
                    icon: '',
                    imageUrl:
                        'https://media.istockphoto.com/id/1128789429/photo/plan-leading-strategy-of-successful-business-competition-leader-concept-hand-of-player-chess.jpg?s=612x612&w=0&k=20&c=srlCT0xWXduYvZsQgGVYl6B4QAaBjoPjpsceTQrP5XQ=',
                },
                {
                    id: 'billiards',
                    title: 'Billiards',
                    icon: '',
                    imageUrl:
                        'https://media.istockphoto.com/id/1370682737/photo/a-group-of-young-people-came-to-play-billiards-and-in-the-young-hands-was-a-cane-and-layers.jpg?s=612x612&w=0&k=20&c=monjVEGbEEjeau83cCqBScfiR1n9SOaqlZpDEB3-Ioo=',
                },
            ]}
            onSubmit={createGroup}
            isPending={createGroupMutation.isPending}
        />
    );
}
