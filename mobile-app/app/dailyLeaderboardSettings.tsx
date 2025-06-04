import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { useGroup, useSeasonSettings } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import Select from '@/components/Select';
import { SeasonSettings } from '@/openapi/openapi';
import { useTheme } from '@/theme';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const { seasonSettings, updateSeasonSettingsMutation } = useSeasonSettings(
        groupId!,
        seasonId!
    );

    const [dailyLeaderboard, setDailyLeaderboard] = useState<string>(
        seasonSettings?.dailyLeaderboard === 'RESET_AT_MIDNIGHT'
            ? 'WAKE_TIME'
            : seasonSettings?.dailyLeaderboard!
    );
    const [wakeTimeDate, setWakeTimeDate] = useState(
        dayjs()
            .startOf('day')
            .add(seasonSettings?.wakeTimeHour ?? 0, 'hours')
            .toDate()
    );

    useEffect(() => {
        if (seasonSettings) {
            setDailyLeaderboard(
                seasonSettings.dailyLeaderboard === 'RESET_AT_MIDNIGHT'
                    ? 'WAKE_TIME'
                    : seasonSettings.dailyLeaderboard
            );
            setWakeTimeDate(
                dayjs()
                    .startOf('day')
                    .add(seasonSettings.wakeTimeHour ?? 0, 'hours')
                    .toDate()
            );
        }
    }, [seasonSettings]);

    const [showTimePicker, setShowTimePicker] = useState(false);

    const isDirty =
        dailyLeaderboard !== seasonSettings?.dailyLeaderboard ||
        wakeTimeDate.getHours() !== seasonSettings?.wakeTimeHour;

    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Daily Leaderboard',
                    headerLeft: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Cancel
                        </HeaderItem>
                    ),
                    headerRight: () => (
                        <HeaderItem
                            noMargin
                            onPress={async () => {
                                try {
                                    if (isDirty) {
                                        await updateSeasonSettingsMutation.mutateAsync(
                                            {
                                                dailyLeaderboard:
                                                    dailyLeaderboard as SeasonSettings['dailyLeaderboard'],
                                                wakeTimeHour:
                                                    wakeTimeDate.getHours(),
                                            }
                                        );
                                    }
                                    nav.goBack();
                                } catch (err) {
                                    ConsoleLogger.error(
                                        'failed to update settings:',
                                        err
                                    );
                                    showErrorToast('Failed to update settings');
                                }
                            }}
                            isLoading={updateSeasonSettingsMutation.isPending}
                        >
                            Save
                        </HeaderItem>
                    ),
                }}
            />
            <InputModal>
                <Select
                    noFlex
                    items={[
                        {
                            value: 'LAST_24_HOURS',
                            title: 'Shows last 24 hours',
                        },
                        {
                            value: 'WAKE_TIME',
                            title: 'Resets at a specific time',
                        },
                    ]}
                    value={dailyLeaderboard}
                    onChange={setDailyLeaderboard}
                />
                <MenuSection
                    style={{
                        opacity: dailyLeaderboard === 'WAKE_TIME' ? 1 : 0.5,
                    }}
                >
                    <MenuItem
                        title="Reset time"
                        headIcon="alarm"
                        tailContent={wakeTimeDate.getHours() + ':00'}
                        tailIconType="next"
                        onPress={() => setShowTimePicker(true)}
                    />
                </MenuSection>
                <ConfirmationModal
                    content={
                        <DateTimePicker
                            mode="time"
                            value={wakeTimeDate}
                            display="spinner"
                            onChange={(_, value) => {
                                if (value) {
                                    setWakeTimeDate(value);
                                }
                            }}
                            textColor={theme.color.text.primary}
                        />
                    }
                    isVisible={showTimePicker}
                    onClose={() => setShowTimePicker(false)}
                    actions={[]}
                />
                {/* <Modal
                    transparent
                    visible={showTimePicker}
                    onRequestClose={() => setShowTimePicker(false)}
                >
                    <Pressable
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            paddingHorizontal: 8,
                        }}
                        onPress={() => setShowTimePicker(false)}
                    >
                        <View
                            style={{
                                backgroundColor: theme.color.modal.bg,
                                borderRadius: 8,
                                padding: 16,
                            }}
                        >
                            <DateTimePicker
                                mode="time"
                                value={wakeTimeDate}
                                display="spinner"
                                onChange={(_, value) => {
                                    if (value) {
                                        setWakeTimeDate(value);
                                    }
                                }}
                                textColor={theme.color.text.primary}
                            />
                        </View>
                    </Pressable>
                </Modal> */}
            </InputModal>
        </>
    );
}
