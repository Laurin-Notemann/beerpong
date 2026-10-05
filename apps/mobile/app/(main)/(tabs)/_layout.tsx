import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/native-tabs';
import React, { type ComponentProps } from 'react';
import { Platform } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import {
    DOCK_IN_TAB_BAR,
    LiveMatchAccessory,
} from '@/components/liveMatch/LiveMatchDock';
import {
    useLingering,
    useLiveMatchDock,
} from '@/lib/liveMatch/useLiveMatchDock';
import { useTheme } from '@/theme';

/**
 * Props for NativeTabs.Trigger.Icon: SF Symbols on iOS, Material Icons from @expo/vector-icons on
 * Android (the `md` prop needs the native expo-symbols module, which this app doesn't ship).
 * A props helper, not a wrapper component: the trigger only reads direct Icon children.
 */
function tabIcon(
    sf: SFSymbol | { default: SFSymbol; selected: SFSymbol },
    md: ComponentProps<typeof MaterialIcons>['name']
) {
    return Platform.OS === 'ios'
        ? { sf }
        : {
              src: (
                  <NativeTabs.Trigger.VectorIcon
                      family={MaterialIcons}
                      name={md}
                  />
              ),
          };
}

// Each screen pads itself for the header and tab bar (lib/useInsets.ts). iOS would otherwise
// also auto-inset only the first scroll view of a tab, which doubles the gap on some pages.
const tabOptions = { disableAutomaticContentInsets: Platform.OS === 'ios' };

// how long the accessory keeps its content after it's told to hide, so it slides out full
const ACCESSORY_HIDE_MS = 600;

export default function TabLayout() {
    const theme = useTheme();

    // The live match dock as the tab bar's bottom accessory (iOS 26+; elsewhere TabStack floats
    // it). Unmounting the accessory would also work, but its content would be gone before
    // UIKit's slide-out. So `bottomAccessoryHidden` hides it (animated by UIKit) while it keeps
    // showing the last match, and it's unmounted once it's out of sight.
    const dock = useLiveMatchDock({ enabled: DOCK_IN_TAB_BAR });
    const accessory = useLingering(
        DOCK_IN_TAB_BAR ? dock.snapshot : undefined,
        ACCESSORY_HIDE_MS
    );

    return (
        <NativeTabs
            unstable_nativeProps={
                DOCK_IN_TAB_BAR
                    ? { ios: { bottomAccessoryHidden: !dock.snapshot } }
                    : undefined
            }
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
            {accessory && (
                <NativeTabs.BottomAccessory>
                    <LiveMatchAccessory
                        snapshot={accessory}
                        onPress={dock.open}
                        onMore={dock.openList}
                    />
                </NativeTabs.BottomAccessory>
            )}
            <NativeTabs.Trigger name="(leaderboard)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    {...tabIcon(
                        { default: 'trophy', selected: 'trophy.fill' },
                        'leaderboard'
                    )}
                />
                <NativeTabs.Trigger.Label>Leaderboard</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(matches)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    {...tabIcon('list.bullet', 'format-list-bulleted')}
                />
                <NativeTabs.Trigger.Label>Matches</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(newMatch)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    {...tabIcon(
                        {
                            default: 'plus.circle',
                            selected: 'plus.circle.fill',
                        },
                        'add-circle'
                    )}
                />
                <NativeTabs.Trigger.Label>New Match</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(rules)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    {...tabIcon(
                        { default: 'book', selected: 'book.fill' },
                        'gavel'
                    )}
                />
                <NativeTabs.Trigger.Label>Rules</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(settings)" {...tabOptions}>
                <NativeTabs.Trigger.Icon
                    {...tabIcon(
                        { default: 'gearshape', selected: 'gearshape.fill' },
                        'settings'
                    )}
                />
                <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
