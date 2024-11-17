import { Tabs } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGroupQuery } from '@/api/calls/group/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { theme } from '@/theme';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export function HeaderItem({
    children,
    noMargin = false,
    onPress,
    disabled = false,
}: {
    children: string;
    noMargin?: boolean;

    onPress?: () => void;

    disabled?: boolean;
}) {
    return (
        <>
            <TouchableOpacity onPress={onPress} disabled={disabled}>
                <ThemedText
                    style={{
                        marginLeft: noMargin ? 0 : 16,
                        marginRight: noMargin ? 0 : 16,

                        fontWeight: 400,
                        fontSize: 17,
                        letterSpacing: 0.1,
                        color: theme.color.text.primary,

                        opacity: disabled ? 0.2 : undefined,
                    }}
                >
                    {children}
                </ThemedText>
            </TouchableOpacity>
            {/* <Button
        onPress={() => {}}
        title={children}
        buttonStyle={{
          marginLeft: 16,
          marginRight: 16,
          backgroundColor: "none",
          padding: 0,
        }}
        titleStyle={{
          fontWeight: 400,
          fontSize: 17,
          letterSpacing: 0.1,
          color: theme.color.text.primary,
        }}
      /> */}
        </>
    );
}

export const navStyles = {
    headerStyle: {
        backgroundColor: theme.color.topNav,

        elevation: 0, // For Android
        shadowOpacity: 0, // For iOS
        borderBottomWidth: 0, // Removes the border for both platforms
    },
    headerTitleStyle: {
        color: theme.color.text.primary,
    },

    tabBarActiveTintColor: theme.color.text.primary,
    tabBarInactiveTintColor: theme.tabBarInactiveTintColor,
    tabBarStyle: {
        backgroundColor: theme.color.bottomNav,

        borderTopWidth: 0,
    },
};

const GroupsButton = () => {
    const nav = useNavigation();

    // @ts-ignore
    return <HeaderItem onPress={() => nav.openDrawer()}>Groups</HeaderItem>;
};

export default function TabLayout() {
    const colorScheme = useColorScheme();

    const { selectedGroupId } = useGroupStore();

    const ding = useGroupQuery(selectedGroupId);

    const groupHeader = {
        ...navStyles,
        headerTitle: ding.data?.data?.name ?? 'Loading',
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
                    tabBarIcon: ({ color, focused }) => (
                        <Icon color={color} size={32} name="home" />
                    ),
                    ...groupHeader,
                }}
            />
            <Tabs.Screen
                name="matches"
                options={{
                    title: 'Matches',

                    tabBarIcon: ({ color, focused }) => (
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
                    tabBarIcon: ({ color, focused }) => (
                        <Icon color={color} size={32} name="pencil-outline" />
                    ),
                    ...groupHeader,
                }}
            />
            <Tabs.Screen
                name="rules"
                options={{
                    title: 'Rules',
                    tabBarIcon: ({ color, focused }) => (
                        <Icon color={color} size={32} name="format-section" />
                    ),
                    ...groupHeader,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, focused }) => (
                        <Icon color={color} size={32} name="cog-outline" />
                    ),
                    ...groupHeader,
                }}
            />
        </Tabs>
    );
}
