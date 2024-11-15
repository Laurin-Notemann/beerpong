import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-root-toast';

export default async function copyToClipboard(value: string, showToast = true) {
    await Clipboard.setStringAsync(value);

    if (showToast) {
        Toast.show('Copied to clipboard.', {
            duration: 1500,
            position: 1,
        });
    }
}
