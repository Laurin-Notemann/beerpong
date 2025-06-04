import Toast, { ToastOptions } from 'react-native-root-toast';

import { triggerHapticBump } from '@/haptics';

/**
 * TODO: refactor these into a useToast hook so we can use useTheme in here
 */
const getToastOptions = (): ToastOptions => {
    return {
        duration: 1500,
        position: 1,
        opacity: 1,
        containerStyle: {
            top: 39 + 4,
            // backgroundColor: 'white',
        },
        // textColor: '#222',
    };
};

export function showErrorToast(message: string) {
    triggerHapticBump('toast:error');
    return Toast.show(message, getToastOptions());
}

export function showSuccessToast(message: string) {
    triggerHapticBump('toast:success');
    return Toast.show(message, getToastOptions());
}

export function showCopiedToClipboardToast() {
    triggerHapticBump('toast:success');
    return Toast.show('Copied to clipboard.', getToastOptions());
}

export function showYouLeftGroupToast(groupName: string) {
    triggerHapticBump('toast:success');
    return Toast.show(`You left "${groupName}".`, getToastOptions());
}
