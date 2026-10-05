import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
    leaderboardWidget,
    showOnWidget,
} from '@/lib/widgets/LeaderboardWidget';
import { type LeaderboardWidgetProps, liveScoresOf } from '@/lib/widgets/props';
import { ScopedLogger } from '@/utils/logging';

// The API's silent push with a group's live scores (`pushWidgets` in apps/api). iOS wakes the
// app for a few seconds to run this, also when it isn't running, so it's defined when this
// module loads; the root layout imports it first thing.

const TASK = 'versus-live-scores';
const logger = new ScopedLogger('widgets');

/** the selected group, read straight from storage: the stores may not be hydrated yet */
async function selectedGroupId() {
    const raw = await AsyncStorage.getItem('selected-group');
    const parsed = raw ? JSON.parse(raw) : undefined;
    return parsed?.state?.selectedGroupId as string | undefined;
}

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
    TASK,
    async ({ data }) => {
        const scores = liveScoresOf('data' in data ? data.data : undefined);
        if (!scores || !leaderboardWidget) {
            return Notifications.BackgroundNotificationTaskResult.NoData;
        }
        try {
            if (scores.groupId !== (await selectedGroupId())) {
                return Notifications.BackgroundNotificationTaskResult.NoData;
            }
            // the rest (leaderboard, names) stays as the app left it
            const timeline = await leaderboardWidget.getTimeline();
            const props = timeline[0]?.props as
                LeaderboardWidgetProps | undefined;
            if (!props?.group) {
                return Notifications.BackgroundNotificationTaskResult.NoData;
            }
            showOnWidget({ ...props, live: scores.matches });
            return Notifications.BackgroundNotificationTaskResult.NewData;
        } catch (err) {
            logger.error('failed to update the widget from a push', err);
            return Notifications.BackgroundNotificationTaskResult.Failed;
        }
    }
);

if (Platform.OS === 'ios') {
    Notifications.registerTaskAsync(TASK).catch((err) =>
        logger.error('failed to register the live scores task', err)
    );
}
