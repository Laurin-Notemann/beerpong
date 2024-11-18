import * as Clipboard from 'expo-clipboard';

import { showCopiedToClipboardToast } from '@/toast';

export default async function copyToClipboard(value: string, showToast = true) {
    await Clipboard.setStringAsync(value);

    if (showToast) {
        showCopiedToClipboardToast();
    }
}
