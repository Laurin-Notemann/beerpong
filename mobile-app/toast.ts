import Toast, { ToastOptions } from 'react-native-root-toast';

import { triggerHapticBump } from '@/haptics';

const toastOptions: ToastOptions = {
    duration: 1500,
    position: 1,
    opacity: 1,
    containerStyle: {
        top: 39,
    },
};

export function showErrorToast(message: string) {
    triggerHapticBump('toast:error');
    return Toast.show(message, toastOptions);
}

export function showSuccessToast(message: string) {
    triggerHapticBump('toast:success');
    return Toast.show(message, toastOptions);
}

export function showCopiedToClipboardToast() {
    triggerHapticBump('toast:success');
    return Toast.show('Copied to clipboard.', toastOptions);
}

export function showYouLeftGroupToast(groupName: string) {
    triggerHapticBump('toast:success');
    return Toast.show(`You left "${groupName}".`, toastOptions);
}
