import * as Haptics from 'expo-haptics';

import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('haptics');
const onError = (error: unknown) => logger.warn('haptic failed', error);

// Haptics.selectionAsync() is a bit to weak for my taste, i think we should only use it for navigation
export function triggerHapticBump(
    action:
        | 'selection'
        | 'toast:success'
        | 'toast:error'
        | 'input:error'
        | 'light'
) {
    if (action === 'toast:success') {
        void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        ).catch(onError);
        return;
    }
    if (action === 'toast:error') {
        void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
        ).catch(onError);
        return;
    }

    if (action === 'input:error') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
            onError
        );
        return;
    }

    if (action === 'light') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            onError
        );
        return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(onError);
}
