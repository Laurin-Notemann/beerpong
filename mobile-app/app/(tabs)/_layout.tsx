import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { HeaderItem } from '@/components/HeaderItem';
import { LeaderboardIcon } from '@/components/LeaderboardIcon';
import { useTheme } from '@/theme';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import { useLocalSettings } from '@/zustand/localSettingsStore';

const CUSTOM_LEADERBOARD_ICON = false;

const GroupsButton = () => {
    const nav = useNavigation();

    // @ts-expect-error nav.openDrawer exists
    return <HeaderItem onPress={() => nav.openDrawer()}>Groups</HeaderItem>;
};

export default function TabLayout() {
    const nav = useNavigation();

    const { selectedGroupId } = useGroupStore();

    const selectedGroup = useGroupQuery(selectedGroupId);

    const experiments = useLocalSettings();

    const navStyles = useNavStyles();

    const theme = useTheme();

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
            tabBar={(props) => {
                return (
                    <View
                        style={{
                            position: 'absolute',

                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                    >
                        <BlurView
                            intensity={theme.blur?.intensity || 50}
                            tint={theme.blur?.tint}
                            style={StyleSheet.absoluteFill}
                        />
                        <BottomTabBar {...props} />
                    </View>
                );
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Leaderboard',
                    tabBarIcon: ({ color, size }) =>
                        CUSTOM_LEADERBOARD_ICON ? (
                            <LeaderboardIcon color={color} size={size} />
                        ) : (
                            <Icon color={color} size={size} name="home" />
                        ),
                    ...groupHeader,
                }}
            />
            <Tabs.Screen
                name="matches"
                options={{
                    title: 'Matches',

                    tabBarIcon: ({ color, size }) => (
                        <Icon
                            color={color}
                            size={size}
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
                    tabBarIcon: ({ color, size }) => (
                        <Icon color={color} size={size} name="pencil-outline" />
                    ),
                    ...groupHeader,
                }}
            />
            <Tabs.Screen
                name="rules"
                options={{
                    title: 'Rules',
                    tabBarIcon: ({ color, size }) => (
                        <Icon color={color} size={size} name="format-section" />
                    ),
                    ...groupHeader,
                    // hide tab in production
                    href: experiments.rulesTab ? undefined : null,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <Icon color={color} size={size} name="cog-outline" />
                    ),
                    ...groupHeader,
                }}
            />
        </Tabs>
    );
}
