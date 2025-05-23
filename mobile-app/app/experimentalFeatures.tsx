import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Switch } from 'react-native';

import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';

import { navStyles } from './navigation/navStyles';

export default function Page() {
    const {
        tutorials,
        toggleTutorials,
        beerpongProMode,
        toggleBeerpongProMode,
        supportAdditionalGames,
        toggleSupportAdditionalGames,
        premiumVersion,
        togglePremiumVersion,
        eloAlgorithm,
        toggleEloAlgorithm,
        rulesTab,
        toggleRulesTab,
        matchPhotos,
        toggleMatchPhotos,
    } = useLocalSettings();

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: '',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
                <MenuSection title="Experimental Features">
                    <MenuItem
                        title="Beerpong Pro Mode"
                        tailContent={
                            <Switch
                                value={beerpongProMode}
                                onChange={toggleBeerpongProMode}
                            />
                        }
                    />
                    <MenuItem
                        title="Support Additional Games"
                        tailContent={
                            <Switch
                                value={supportAdditionalGames}
                                onChange={toggleSupportAdditionalGames}
                            />
                        }
                    />
                    <MenuItem
                        title="Tutorials"
                        tailContent={
                            <Switch
                                value={tutorials}
                                onChange={toggleTutorials}
                            />
                        }
                    />
                    <MenuItem
                        title="Premium Version"
                        tailContent={
                            <Switch
                                value={premiumVersion}
                                onChange={togglePremiumVersion}
                            />
                        }
                    />
                    <MenuItem
                        title="Elo Algorithm"
                        tailContent={
                            <Switch
                                value={eloAlgorithm}
                                onChange={toggleEloAlgorithm}
                            />
                        }
                    />
                    <MenuItem
                        title="Rules Tab"
                        tailContent={
                            <Switch
                                value={rulesTab}
                                onChange={toggleRulesTab}
                            />
                        }
                    />
                    <MenuItem
                        title="Team Photos"
                        tailContent={
                            <Switch
                                value={matchPhotos}
                                onChange={toggleMatchPhotos}
                            />
                        }
                    />
                </MenuSection>
            </ScrollView>
        </>
    );
}
