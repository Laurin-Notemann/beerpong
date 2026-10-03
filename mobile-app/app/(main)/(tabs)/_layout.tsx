import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/native-tabs';
import React, { type ComponentProps } from 'react';
import { Platform } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from '@/theme';

/**
 * SF Symbols on iOS; Material Icons from @expo/vector-icons on Android. (The `md` prop of
 * NativeTabs.Trigger.Icon needs the native expo-symbols module, which this app doesn't ship.)
 */
function TabIcon({
    sf,
    md,
}: {
    sf: SFSymbol | { default: SFSymbol; selected: SFSymbol };
    md: ComponentProps<typeof MaterialIcons>['name'];
}) {
    return Platform.OS === 'ios' ? (
        <NativeTabs.Trigger.Icon sf={sf} />
    ) : (
        <NativeTabs.Trigger.Icon
            src={
                <NativeTabs.Trigger.VectorIcon
                    family={MaterialIcons}
                    name={md}
                />
            }
        />
    );
}

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
                <TabIcon
                    sf={{ default: 'trophy', selected: 'trophy.fill' }}
                    md="leaderboard"
                />
                <NativeTabs.Trigger.Label>Leaderboard</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(matches)" {...tabOptions}>
                <TabIcon sf="list.bullet" md="format-list-bulleted" />
                <NativeTabs.Trigger.Label>Matches</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(newMatch)" {...tabOptions}>
                <TabIcon
                    sf={{
                        default: 'plus.circle',
                        selected: 'plus.circle.fill',
                    }}
                    md="add-circle"
                />
                <NativeTabs.Trigger.Label>New Match</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(rules)" {...tabOptions}>
                <TabIcon
                    sf={{ default: 'book', selected: 'book.fill' }}
                    md="gavel"
                />
                <NativeTabs.Trigger.Label>Rules</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(settings)" {...tabOptions}>
                <TabIcon
                    sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
                    md="settings"
                />
                <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
