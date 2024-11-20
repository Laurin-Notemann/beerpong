import Toast from 'react-native-root-toast';

export function showErrorToast(message: string) {
    return Toast.show(message, {
        duration: 1500,
        position: 1,
        opacity: 1,
    });
}

export function showCopiedToClipboardToast() {
    return Toast.show('Copied to clipboard.', {
        duration: 1500,
        position: 1,
        opacity: 1,
    });
}

export function showYouLeftGroupToast(groupName: string) {
    return Toast.show(`You left "${groupName}".`, {
        duration: 1500,
        position: 1,
        opacity: 1,
    });
}
