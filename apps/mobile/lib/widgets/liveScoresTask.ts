import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import {
    liveMatchesWidget,
    showLiveMatches,
} from '@/lib/widgets/LiveMatchesWidget';
import {
    type LiveMatchesWidgetProps,
    liveScoresOf,
    mergeLiveMatches,
} from '@/lib/widgets/props';
import { ScopedLogger } from '@/utils/logging';

// The API's silent push with a group's live scores (`pushWidgets` in apps/api). iOS wakes the
// app for a few seconds to run this, also when it isn't running, so it's defined when this
// module loads; the root layout imports it first thing.

const TASK = 'versus-live-scores';
const logger = new ScopedLogger('widgets');

/**
 * the selected group, read straight from storage: the stores may not be hydrated yet. Only for
 * widget props from before they had `groupId`; the storage can't be read while the phone is locked.
 */
async function storedGroupId() {
    const raw = await AsyncStorage.getItem('selected-group');
    const parsed = raw
        ? (JSON.parse(raw) as { state?: { selectedGroupId?: unknown } } | null)
        : undefined;
    const id = parsed?.state?.selectedGroupId;
    return typeof id === 'string' ? id : undefined;
}

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
    TASK,
    async ({ data }) => {
        const scores = liveScoresOf('data' in data ? data.data : undefined);
        if (!scores || !liveMatchesWidget) {
            return Notifications.BackgroundNotificationTaskResult.NoData;
        }
        let step = 'reading the widget';
        try {
            // the group's name and id stay as the app left them
            const timeline = await liveMatchesWidget.getTimeline();
            const props = timeline[0]?.props as
                | LiveMatchesWidgetProps
                | undefined;
            if (!props?.group) {
                return Notifications.BackgroundNotificationTaskResult.NoData;
            }
            step = 'reading the selected group';
            const groupId = props.groupId ?? (await storedGroupId());
            if (scores.groupId !== groupId) {
                return Notifications.BackgroundNotificationTaskResult.NoData;
            }
            step = 'updating the widget';
            showLiveMatches(
                mergeLiveMatches(
                    {
                        group: props.group,
                        groupId: props.groupId,
                        matches: scores.matches,
                    },
                    props
                )
            );
            return Notifications.BackgroundNotificationTaskResult.NewData;
        } catch (err) {
            logger.error(
                `failed to update the widget from a push (${step})`,
                err
            );
            return Notifications.BackgroundNotificationTaskResult.Failed;
        }
    }
);

if (Platform.OS === 'ios') {
    Notifications.registerTaskAsync(TASK).catch((err) =>
        logger.error('failed to register the live scores task', err)
    );
}
