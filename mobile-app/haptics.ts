import * as Haptics from 'expo-haptics';

export function triggerHapticBump(
    action: 'selection' | 'toast:success' | 'toast:error'
) {
    if (action === 'toast:success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (action === 'toast:error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    Haptics.selectionAsync();

    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium`);
}
