import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/theme';

// Each screen pads itself for the header and tab bar (lib/useInsets.ts). iOS would otherwise
// also auto-inset only the first scroll view of a tab, which doubles the gap on some pages.
const tabOptions = { disableAutomaticContentInsets: Platform.OS === 'ios' };

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
            <NativeTabs.Trigger name="(leaderboard)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'trophy', selected: 'trophy.fill' }}
                    md="leaderboard"
                />
                <NativeTabs.Trigger.Label>Leaderboard</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(matches)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    sf="list.bullet"
                    md="format_list_bulleted"
                />
                <NativeTabs.Trigger.Label>Matches</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(newMatch)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    sf={{
                        default: 'plus.circle',
                        selected: 'plus.circle.fill',
                    }}
                    md="add_circle"
                />
                <NativeTabs.Trigger.Label>New Match</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(rules)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'book', selected: 'book.fill' }}
                    md="gavel"
                />
                <NativeTabs.Trigger.Label>Rules</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(settings)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
                    md="settings"
                />
                <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
