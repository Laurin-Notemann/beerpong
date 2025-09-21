import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { AxiosError } from 'axios';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { useEffect, useRef } from 'react';
import {
    Animated,
    ScrollView,
    TouchableHighlight,
    TouchableOpacity,
} from 'react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { env } from '@/api/env';
import { useNavigation } from '@/app/navigation/useNavigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import Text from '@/components/Text';
import { useTheme } from '@/theme';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

const RENDER_AS_MENU_ITEM = false;

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
    const { data, isLoading, error } = useGroupQuery(id);

    // we don't have functionality to delete a group, so this most likely means that either
    // (1) the backend database was wiped
    // (2) we switched e.g. from local dev to staging backend
    const groupDoesntExist =
        error instanceof AxiosError && error.response?.status === 404;

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

    const theme = useTheme();

    if (RENDER_AS_MENU_ITEM) {
        return (
            <MenuItem
                title={data?.data?.name || 'Unknown'}
                subtitle={
                    isLoading
                        ? ''
                        : failedToLoad
                          ? 'Failed to load'
                          : `${data!.data!.numberOfPlayers} Players · ${data!.data!.numberOfMatches} Matches`
                }
                onPress={() => onPress(id)}
                border={false}
                active={isActive}
                onDrag={showDeleteButton ? () => {} : undefined}
                color="dark"
            />
        );
    }

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isActive ? theme.activeGroupItem : undefined,

                height: 58,
            }}
        >
            <TouchableOpacity onPress={() => onDelete(id)}>
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
            </TouchableOpacity>

            <TouchableHighlight
                disabled={isActive}
                onPress={() => onPress(id)}
                underlayColor={theme.panel.dark.active}
                style={{ flex: 1, flexShrink: 1 }}
            >
                <View
                    style={{
                        paddingHorizontal: 17,
                        paddingVertical: 12,

                        overflow: 'hidden',
                    }}
                >
                    <Text
                        color="primary"
                        style={{ fontSize: 17 }}
                        numberOfLines={1}
                    >
                        {isLoading ? (
                            'Loading...'
                        ) : groupDoesntExist ? (
                            <>
                                <Icon
                                    name="alert"
                                    size={16}
                                    color="#CCA700"
                                    style={{
                                        marginLeft: 12,
                                    }}
                                />{' '}
                                Unknown
                            </>
                        ) : (
                            data?.data?.name || 'Unknown'
                        )}
                    </Text>
                    <Text
                        color="secondary"
                        style={{ fontSize: 12 }}
                        numberOfLines={1}
                    >
                        {isLoading
                            ? ''
                            : failedToLoad
                              ? 'Failed to load'
                              : `${data!.data!.numberOfPlayers} Players · ${data!.data!.numberOfMatches} Matches`}
                    </Text>
                </View>
            </TouchableHighlight>
        </View>
    );
}

export interface SidebarGroup {
    id: string;
    name: string;
    playersCount: number;
    matchesCount: number;
}

// eslint-disable-next-line no-empty-pattern
export function Sidebar(props: DrawerContentComponentProps) {
    const { groupIds, selectedGroupId, selectGroup, removeGroup } =
        useGroupStore();

    const nav = useNavigation();

    const [showAddGroupModal, setShowAddGroupModal] = useState(false);

    const [isEditMode, setIsEditMode] = useState(false);

    const [groupIdToBeDeleted, setGroupIdToBeDeleted] = useState<string | null>(
        null
    );

    const matchDraft = useMatchDraftStore((store) => store.actions);

    const theme = useTheme();

    return (
        <SafeAreaView
            style={{
                backgroundColor: theme.color.bg,
                flex: 1,
                paddingHorizontal: 16,

                gap: 20,
            }}
        >
            <MenuSection color="dark" noFlex>
                <View
                    style={{
                        flexDirection: 'row',

                        height: 50,
                    }}
                >
                    <>
                        <TouchableOpacity
                            onPress={() => setIsEditMode(!isEditMode)}
                            style={{
                                marginRight: 'auto',

                                justifyContent: 'center',

                                height: '100%',
                                paddingHorizontal: 16,
                            }}
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
                            style={{
                                marginLeft: 'auto',
                                justifyContent: 'center',

                                height: '100%',
                                paddingHorizontal: 16,
                            }}
                        >
                            <Icon
                                name="plus"
                                size={24}
                                color={theme.color.text.primary}
                            />
                        </TouchableOpacity>
                    </>
                </View>
            </MenuSection>

            <MenuSection
                color="dark"
                style={{
                    flex: 1,
                }}
            >
                <ScrollView>
                    {groupIds.map((id) => (
                        <SidebarGroupItem
                            key={id}
                            id={id}
                            isActive={id === selectedGroupId}
                            onPress={() => {
                                selectGroup(id);
                                matchDraft.clear();

                                while (nav.canGoBack()) {
                                    nav.goBack();
                                }

                                // eslint-disable-next-line
                                console.log(Object.keys(nav));
                                // nav.closeDrawer();
                                props.navigation.closeDrawer();
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
                                href="/joinGroup"
                                style={{
                                    color: theme.color.text.primary,
                                    fontWeight: 500,
                                }}
                            >
                                Join
                            </Link>{' '}
                            or{' '}
                            <Link
                                href="/createGroup"
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
                </ScrollView>
            </MenuSection>
            <View
                style={{
                    height: 200, // this is not really pixel perfect lol, this needs to have an explicit height in order for the layout to autosize correctly
                }}
            >
                <MenuSection
                    style={{
                        alignSelf: 'stretch',
                    }}
                    color="dark"
                >
                    <MenuItem
                        border={false}
                        title="Settings"
                        headIcon="cog-outline"
                        onPress={() =>
                            props.navigation.navigate('static/aboutPremium', {
                                screen: 'localSettings',
                            })
                        }
                        tailIconType="next"
                    />

                    <MenuItem
                        title="Privacy Policy"
                        headIcon="shield-lock"
                        onPress={() =>
                            props.navigation.navigate('static/aboutPremium', {
                                screen: 'static/privacyPolicy',
                            })
                        }
                        tailIconType="next"
                    />
                    <MenuItem
                        title="About Us"
                        headIcon="information-outline"
                        onPress={() =>
                            props.navigation.navigate('static/aboutPremium', {
                                screen: 'static/aboutUs',
                            })
                        }
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
                                    props.navigation.navigate(
                                        'static/aboutPremium',
                                        {
                                            screen: 'createGroup',
                                        }
                                    );
                                    setShowAddGroupModal(false);
                                },
                            },
                            {
                                title: 'Join',
                                type: 'default',

                                onPress: () => {
                                    props.navigation.navigate(
                                        'static/aboutPremium',
                                        {
                                            screen: 'joinGroup',
                                        }
                                    );
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
            </View>
        </SafeAreaView>
    );
}
