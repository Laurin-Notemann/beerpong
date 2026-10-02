import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { useGroup, useSeasonSettings } from '@/api/calls/seasonHooks';
import ConfirmationModal from '@/components/ConfirmationModal';
import InputModal from '@/components/InputModal';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import Select from '@/components/Select';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { SeasonSettingsDto } from '@/openapi/openapi';
import { useTheme } from '@/theme';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';
import { formatWakeTime, parseWakeTime, toWakeTime } from '@/utils/wakeTime';

const wakeTimeToDate = (wakeTime: string | undefined) => {
    const { hour, minute } = parseWakeTime(wakeTime);

    return dayjs().startOf('day').hour(hour).minute(minute).toDate();
};

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const { seasonSettings, updateSeasonSettingsMutation } = useSeasonSettings(
        groupId!,
        seasonId!
    );

    // Unedited fields show the saved settings.
    const [editedDailyLeaderboard, setDailyLeaderboard] = useState<string>();
    const [editedWakeTimeDate, setWakeTimeDate] = useState<Date>();

    const dailyLeaderboard =
        editedDailyLeaderboard ??
        (seasonSettings?.dailyLeaderboard === 'RESET_AT_MIDNIGHT'
            ? 'WAKE_TIME'
            : seasonSettings?.dailyLeaderboard!);
    const wakeTimeDate =
        editedWakeTimeDate ?? wakeTimeToDate(seasonSettings?.wakeTime);

    const [showTimePicker, setShowTimePicker] = useState(false);

    const isDirty =
        dailyLeaderboard !== seasonSettings?.dailyLeaderboard ||
        toWakeTime(wakeTimeDate) !== seasonSettings?.wakeTime;

    const theme = useTheme();

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Daily Leaderboard' }} />
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button onPress={() => nav.goBack()}>
                    Cancel
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    disabled={updateSeasonSettingsMutation.isPending}
                    onPress={async () => {
                        try {
                            if (isDirty) {
                                await updateSeasonSettingsMutation.mutateAsync({
                                    dailyLeaderboard:
                                        dailyLeaderboard as SeasonSettingsDto['dailyLeaderboard'],
                                    wakeTime: toWakeTime(wakeTimeDate),
                                });
                            }
                            nav.goBack();
                        } catch (err) {
                            ConsoleLogger.error(
                                'failed to update settings:',
                                err
                            );
                            showErrorToast('Failed to update settings.', err);
                        }
                    }}
                >
                    Save
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
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
                        border={false}
                        title="Reset time"
                        headIcon="alarm"
                        tailContent={formatWakeTime(toWakeTime(wakeTimeDate))}
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
