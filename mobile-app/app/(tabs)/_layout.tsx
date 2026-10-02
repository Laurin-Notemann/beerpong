import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';

import { useTheme } from '@/theme';

export default function TabLayout() {
    const theme = useTheme();

    return (
        <NativeTabs
            // Liquid Glass floats its own bar; older iOS keeps a solid bar on short lists.
            disableTransparentOnScrollEdge={!isLiquidGlassAvailable()}
            iconColor={{
                default: theme.tabBarInactiveTintColor,
                selected: theme.color.text.primary,
            }}
            labelStyle={{
                default: { color: theme.tabBarInactiveTintColor },
                selected: { color: theme.color.text.primary },
            }}
            labelVisibilityMode="labeled"
            tintColor={theme.color.text.primary}
        >
            <NativeTabs.Trigger name="(leaderboard)">
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'trophy', selected: 'trophy.fill' }}
                    md="leaderboard"
                />
                <NativeTabs.Trigger.Label>Leaderboard</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(matches)">
                <NativeTabs.Trigger.Icon
                    sf="list.bullet"
                    md="format_list_bulleted"
                />
                <NativeTabs.Trigger.Label>Matches</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(newMatch)">
                <NativeTabs.Trigger.Icon
                    sf={{
                        default: 'plus.circle',
                        selected: 'plus.circle.fill',
                    }}
                    md="add_circle"
                />
                <NativeTabs.Trigger.Label>New Match</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(rules)">
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'book', selected: 'book.fill' }}
                    md="gavel"
                />
                <NativeTabs.Trigger.Label>Rules</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(settings)">
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
                    md="settings"
                />
                <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
