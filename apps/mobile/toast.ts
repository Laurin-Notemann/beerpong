import { isAxiosError } from 'axios';
import { toast } from 'sonner-native';

import { triggerHapticBump } from '@/haptics';
import type { Components } from '@/openapi/openapi';

/**
 * Why a request failed, in words a player at the table understands. Network problems
 * (server down, no signal, timeout) get one message; otherwise the server's own error
 * description (`ResponseEnvelope.error.description`) when it sent one.
 */
export function describeError(error: unknown): string | undefined {
    if (isAxiosError<{ error?: Components.Schemas.ErrorDetails }>(error)) {
        if (!error.response) {
            return "Can't reach the server. Check your connection and try again.";
        }
        const description = error.response.data?.error?.description;
        if (typeof description === 'string' && description) return description;
        if (error.response.status >= 500) {
            return 'The server ran into a problem. Try again in a moment.';
        }
    }
    return undefined;
}

/**
 * Shows `message`, with the reason from `error` underneath. Error toasts share one id, so a
 * burst of failures (e.g. every refetch while the server is down) shows a single toast.
 */
export function showErrorToast(message: string, error?: unknown) {
    triggerHapticBump('toast:error');
    toast.error(message, { id: 'error', description: describeError(error) });
}

export function showSuccessToast(message: string) {
    triggerHapticBump('toast:success');
    toast.success(message);
}

export function showCopiedToClipboardToast() {
    showSuccessToast('Copied to clipboard.');
}

export function showYouLeftGroupToast(groupName: string) {
    showSuccessToast(`You left "${groupName}".`);
}
