import { Link } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler';
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
}

export function SidebarGroupItem({
    id,
    isActive,
    onPress,
}: SidebarGroupItemProps) {
    const { data, isLoading } = useGroupQuery(id);

    return (
        <TouchableHighlight
            disabled={isActive}
            underlayColor={theme.panel.light.active}
            onPress={() => onPress(id)}
            style={{
                display: 'flex',
                backgroundColor: isActive ? 'rgba(0, 0, 0, 0.3)' : undefined,
                paddingHorizontal: 17,
                paddingVertical: 12,
            }}
        >
            <>
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
            </>
        </TouchableHighlight>
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
                backgroundColor: '#000',
                flex: 1,
                paddingHorizontal: 16,

                gap: 20,
            }}
        >
            <TouchableHighlight
                underlayColor={theme.panel.light.active}
                onPress={() => setShowAddGroupModal(true)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',

                    height: 50,
                    paddingHorizontal: 16,

                    backgroundColor: '#1A1A1A',
                    borderRadius: 10,
                }}
            >
                {/* <Text
                    color="primary"
                    style={{
                        fontWeight: 500,
                    }}
                >
                    Edit
                </Text> */}
                <Pressable
                    onPress={() => setShowAddGroupModal(true)}
                    style={{ marginLeft: 'auto' }}
                >
                    <Icon name="plus" size={24} color="#fff" />
                </Pressable>
            </TouchableHighlight>

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
