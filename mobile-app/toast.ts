import Toast from 'react-native-root-toast';

import { triggerHapticBump } from './haptics';

export function showErrorToast(message: string) {
    triggerHapticBump('toast:error');
    return Toast.show(message, {
        duration: 1500,
        position: 1,
        opacity: 1,
    });
}

export function showSuccessToast(message: string) {
    triggerHapticBump('toast:success');
    return Toast.show(message, {
        duration: 1500,
        position: 1,
        opacity: 1,
    });
}

export function showCopiedToClipboardToast() {
    triggerHapticBump('toast:success');
    return Toast.show('Copied to clipboard.', {
        duration: 1500,
        position: 1,
        opacity: 1,
    });
}

export function showYouLeftGroupToast(groupName: string) {
    triggerHapticBump('toast:success');
    return Toast.show(`You left "${groupName}".`, {
        duration: 1500,
        position: 1,
        opacity: 1,
    });
}
