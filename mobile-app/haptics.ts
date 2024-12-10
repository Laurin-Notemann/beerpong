import * as Haptics from 'expo-haptics';

// Haptics.selectionAsync() is a bit to weak for my taste, i think we should only use it for navigation
export function triggerHapticBump(
    action: 'selection' | 'toast:success' | 'toast:error' | 'input:error'
) {
    if (action === 'toast:success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
    }
    if (action === 'toast:error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
    }

    if (action === 'input:error') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
