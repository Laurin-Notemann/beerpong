import { Tabs } from 'expo-router';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { env } from '@/api/env';
import { env } from '@/api/env';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import { HeaderItem } from '../../components/HeaderItem';

const GroupsButton = () => {
    const nav = useNavigation();

    // @ts-expect-error nav.openDrawer exists
    return <HeaderItem onPress={() => nav.openDrawer()}>Groups</HeaderItem>;
};

export default function TabLayout() {
    const nav = useNavigation();

    const colorScheme = useColorScheme();

    const { selectedGroupId } = useGroupStore();

    const selectedGroup = useGroupQuery(selectedGroupId);

    const headerTitleIfGroupIsLoading = '';
    const headerTitleIfGroupCantBeFound = '';

    if (!selectedGroupId) {
        nav.navigate('onboarding');
        return;
    }

    const groupHeader = {
        ...navStyles,
        headerTitle: selectedGroup.isLoading
            ? headerTitleIfGroupIsLoading
            : (selectedGroup.data?.data?.name ?? headerTitleIfGroupCantBeFound),
        headerShown: true,
        headerLeft: GroupsButton,
    };

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Leaderboard',
                    tabBarIcon: ({ color }) => (
                        <Icon color={color} size={32} name="home" />
                    ),
                    ...groupHeader,
                }}
            />
            <Tabs.Screen
                name="matches"
                options={{
                    title: 'Matches',

                    tabBarIcon: ({ color }) => (
                        <Icon
                            color={color}
                            size={32}
                            name="format-list-bulleted"
                        />
                    ),
                    ...groupHeader,
                }}
            />
            <Tabs.Screen
                name="newMatch"
                options={{
                    title: 'New Match',
                    tabBarIcon: ({ color }) => (
                        <Icon color={color} size={32} name="pencil-outline" />
                    ),
                    ...groupHeader,
                }}
            />
            <Tabs.Screen
                name="rules"
                options={{
                    title: 'Rules',
                    tabBarIcon: ({ color }) => (
                        <Icon color={color} size={32} name="format-section" />
                    ),
                    ...groupHeader,
                    // hide tab in production
                    href: env.isDev ? undefined : null,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => (
                        <Icon color={color} size={32} name="cog-outline" />
                    ),
                    ...groupHeader,
                }}
            />
        </Tabs>
    );
}
