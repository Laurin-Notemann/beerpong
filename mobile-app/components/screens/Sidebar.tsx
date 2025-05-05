import { Link } from '@react-navigation/native';
import React, { useState } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { env } from '@/api/env';
import { useNavigation } from '@/app/navigation/useNavigation';
import { theme } from '@/theme';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import ConfirmationModal from '../ConfirmationModal';
import MenuItem from '../Menu/MenuItem';
import MenuSection from '../Menu/MenuSection';
import Text from '../Text';

export interface SidebarGroupItemProps {
    id: string;
    isActive: boolean;
    onPress: (id: string) => void;
    showDeleteButton?: boolean;
    onDelete: (id: string) => void;
}

export function SidebarGroupItem({
    id,
    isActive,
    onPress,
    showDeleteButton = false,
    onDelete,
}: SidebarGroupItemProps) {
    const { data, isLoading } = useGroupQuery(id);

    const failedToLoad =
        data?.data?.numberOfPlayers == null ||
        data?.data?.numberOfMatches == null;

    // width of the square around the delete button that slides out when the sidebar is in edit mode
    const deleteActionWidth = useRef(
        new Animated.Value(showDeleteButton ? 40 : 0)
    ).current;

    useEffect(() => {
        Animated.timing(deleteActionWidth, {
            toValue: showDeleteButton ? 40 : 0,
            duration: 150,
            useNativeDriver: false, // width property needs JS driver to animate
        }).start();
    }, [showDeleteButton]);

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isActive ? 'rgba(0,0,0,0.3)' : undefined,

                height: 58,
            }}
        >
            <Pressable onPress={() => onDelete(id)}>
                <Animated.View
                    style={{
                        justifyContent: 'center',

                        width: deleteActionWidth,
                        height: '100%',
                    }}
                >
                    <Icon
                        name="minus-circle"
                        size={24}
                        color="#f55"
                        style={{
                            marginLeft: 12,
                        }}
                    />
                </Animated.View>
            </Pressable>

            <Pressable
                disabled={isActive}
                onPress={() => onPress(id)}
                style={{ flex: 1, paddingHorizontal: 17, paddingVertical: 12 }}
            >
                <>
                    <Text color="primary" style={{ fontSize: 17 }}>
                        {isLoading
                            ? 'Loading...'
                            : (data?.data?.name ?? 'Unknown')}
                    </Text>
                    <Text color="secondary" style={{ fontSize: 12 }}>
                        {isLoading
                            ? ''
                            : failedToLoad
                              ? 'Failed to load'
                              : `${data!.data!.numberOfPlayers} Players, ${data!.data!.numberOfMatches} Matches`}
                    </Text>
                </>
            </Pressable>
        </View>
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
    const { groupIds, selectedGroupId, selectGroup, removeGroup } =
        useGroupStore();

    const nav = useNavigation();

    const [showAddGroupModal, setShowAddGroupModal] = useState(false);

    const [isEditMode, setIsEditMode] = useState(false);

    const [groupIdToBeDeleted, setGroupIdToBeDeleted] = useState<string | null>(
        null
    );

    return (
        <SafeAreaView
            style={{
                backgroundColor: '#000',
                flex: 1,
                paddingHorizontal: 16,

                gap: 20,
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',

                    height: 50,
                    paddingHorizontal: 16,

                    backgroundColor: '#1A1A1A',
                    borderRadius: 10,
                }}
            >
                <>
                    <TouchableOpacity
                        onPress={() => setIsEditMode(!isEditMode)}
                        style={{ marginRight: 'auto' }}
                    >
                        <Text
                            color="primary"
                            style={{
                                fontWeight: 500,
                            }}
                        >
                            {isEditMode ? 'Done' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowAddGroupModal(true)}
                        style={{ marginLeft: 'auto' }}
                    >
                        <Icon name="plus" size={24} color="#fff" />
                    </TouchableOpacity>
                </>
            </View>

            <View
                style={{
                    backgroundColor: '#1A1A1A',

                    borderRadius: 10,

                    flex: 1,
                }}
            >
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
                        showDeleteButton={isEditMode}
                        onDelete={setGroupIdToBeDeleted}
                    />
                ))}
                {groupIds.length < 1 && (
                    <Text
                        color="secondary"
                        style={{
                            textAlign: 'center',
                            // paddingTop: 64,
                            // lineHeight: 26,

                            flex: 1,

                            display: 'flex',
                            alignItems: 'center',
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
            </View>
            <MenuSection
                style={{
                    alignSelf: 'stretch',
                }}
                color="dark"
            >
                {env.isDev && (
                    <MenuItem
                        title="Settings"
                        headIcon="cog-outline"
                        onPress={() => nav.navigate('localSettings')}
                        tailIconType="next"
                    />
                )}
                <MenuItem
                    title="Privacy Policy"
                    headIcon="shield-lock"
                    onPress={() => nav.navigate('static/privacyPolicy')}
                    tailIconType="next"
                />
                <MenuItem
                    title="About Us"
                    headIcon="information-outline"
                    onPress={() => nav.navigate('static/aboutUs')}
                    tailIconType="next"
                />
            </MenuSection>

            <ConfirmationModal
                onClose={() => setShowAddGroupModal(false)}
                title="Add Group"
                actions={
                    [
                        {
                            title: 'Create',
                            type: 'default',

                            onPress: () => {
                                nav.navigate('createGroup');
                                setShowAddGroupModal(false);
                            },
                        },
                        {
                            title: 'Join',
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
            <ConfirmationModal
                onClose={() => setGroupIdToBeDeleted(null)}
                title="Leave Group"
                description="Are you sure you want to leave this group?"
                actions={
                    [
                        {
                            title: 'Leave',
                            type: 'danger',

                            onPress: () => {
                                if (groupIdToBeDeleted) {
                                    removeGroup(groupIdToBeDeleted);
                                }
                                setGroupIdToBeDeleted(null);
                            },
                        },
                        {
                            title: 'Cancel',
                            type: 'default',

                            onPress: () => {
                                setGroupIdToBeDeleted(null);
                            },
                        },
                    ] as const
                }
                isVisible={groupIdToBeDeleted != null}
            />
            <Text
                color="secondary"
                style={{
                    fontSize: 12,
                    color: '#545456',
                    fontWeight: 400,

                    textAlign: 'center',
                }}
            >
                Version {env.appVersion}
            </Text>
        </SafeAreaView>
    );
}
