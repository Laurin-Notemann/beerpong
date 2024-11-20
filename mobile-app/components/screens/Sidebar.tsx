import { Link } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { theme } from '@/theme';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import ConfirmationModal from '../ConfirmationModal';
import Text from '../Text';

export interface SidebarGroupItemProps {
    id: string;
    isActive: boolean;
    onPress: (id: string) => void;
}

export function SidebarGroupItem({
    id,
    isActive,
    onPress,
}: SidebarGroupItemProps) {
    const { data, isLoading } = useGroupQuery(id);

    return (
        <Pressable
            onPress={() => onPress(id)}
            style={{
                display: 'flex',
                backgroundColor: isActive ? 'rgba(0, 0, 0, 0.3)' : undefined,
                paddingHorizontal: 17,
                paddingVertical: 12,
            }}
        >
            <Text
                color="primary"
                style={{
                    fontSize: 17,
                }}
            >
                {isLoading ? 'Loading...' : (data?.data?.name ?? 'Unknown')}
            </Text>
            <Text
                color="secondary"
                style={{
                    fontSize: 12,
                }}
            >
                {isLoading ? (
                    ''
                ) : (
                    <>
                        {data?.data?.numberOfPlayers} Players,{' '}
                        {data?.data?.numberOfMatches} Matches
                    </>
                )}
            </Text>
        </Pressable>
    );
}

export interface SidebarGroup {
    id: string;
    name: string;
    playersCount: number;
    matchesCount: number;
}

export interface SidebarProps {}

// eslint-disable-next-line no-empty-pattern
export function Sidebar({}: SidebarProps) {
    const { groupIds, selectedGroupId, selectGroup } = useGroupStore();

    const nav = useNavigation();

    const [showAddGroupModal, setShowAddGroupModal] = useState(false);

    return (
        <SafeAreaView
            style={{
                backgroundColor: '#1A1A1A',
                flex: 1,
                paddingHorizontal: 16,
            }}
        >
            <Pressable onPress={() => setShowAddGroupModal(true)}>
                <Icon name="plus" size={24} color="#fff" />
            </Pressable>

            {groupIds.map((id) => (
                <SidebarGroupItem
                    key={id}
                    id={id}
                    isActive={id === selectedGroupId}
                    onPress={() => {
                        selectGroup(id);

                        // eslint-disable-next-line
                        console.log(Object.keys(nav));
                        // nav.closeDrawer();
                    }}
                />
            ))}
            {groupIds.length < 1 && (
                <Text
                    color="secondary"
                    style={{
                        textAlign: 'center',
                        paddingTop: 64,
                        lineHeight: 26,
                    }}
                >
                    No groups to display. {'\n'}
                    <Link
                        to="/joinGroup"
                        style={{
                            color: theme.color.text.primary,
                            fontWeight: 500,
                        }}
                    >
                        Join
                    </Link>{' '}
                    or{' '}
                    <Link
                        to="/createGroup"
                        style={{
                            color: theme.color.text.primary,
                            fontWeight: 500,
                        }}
                    >
                        Create
                    </Link>{' '}
                    one.
                </Text>
            )}

            <ConfirmationModal
                header={false}
                onClose={() => setShowAddGroupModal(false)}
                title=""
                description=""
                actions={
                    [
                        {
                            title: 'Create Group',
                            type: 'default',

                            onPress: () => {
                                nav.navigate('createGroup');
                                setShowAddGroupModal(false);
                            },
                        },
                        {
                            title: 'Join Group',
                            type: 'default',

                            onPress: () => {
                                nav.navigate('joinGroup');
                                setShowAddGroupModal(false);
                            },
                        },
                    ] as const
                }
                isVisible={showAddGroupModal}
            />
        </SafeAreaView>
    );
}
