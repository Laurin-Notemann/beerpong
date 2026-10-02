import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Silent OTA updates: checks and downloads when the app comes to the foreground,
 * and only applies a downloaded update once the app is backgrounded, so the user
 * never sees a reload mid-session.
 */
export function useOtaUpdates() {
    const { isUpdatePending, isChecking, isDownloading } = Updates.useUpdates();

    // AppState listeners are registered once, so read the latest flags via a ref.
    const state = useRef({ isUpdatePending, isChecking, isDownloading });
    state.current = { isUpdatePending, isChecking, isDownloading };

    useEffect(() => {
        if (__DEV__ || !Updates.isEnabled) return;

        const applyPending = () => {
            if (
                !state.current.isUpdatePending ||
                AppState.currentState !== 'background'
            )
                return;
            Updates.reloadAsync().catch((error: unknown) => {
                Sentry.captureException(error, {
                    tags: { ota: 'reload' },
                });
            });
        };

        const checkForUpdate = async () => {
            const { isUpdatePending, isChecking, isDownloading } =
                state.current;
            if (isUpdatePending || isChecking || isDownloading) return;
            try {
                const result = await Updates.checkForUpdateAsync();
                if (result.isAvailable || result.isRollBackToEmbedded) {
                    await Updates.fetchUpdateAsync();
                }
            } catch (error) {
                Sentry.captureException(error, { tags: { ota: 'check' } });
            }
        };

        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') checkForUpdate();
            if (next === 'background') applyPending();
        });
        return () => subscription.remove();
    }, []);

    // A download can finish after the app was already backgrounded.
    useEffect(() => {
        if (
            isUpdatePending &&
            !__DEV__ &&
            AppState.currentState === 'background'
        ) {
            Updates.reloadAsync().catch((error: unknown) => {
                Sentry.captureException(error, { tags: { ota: 'reload' } });
            });
        }
    }, [isUpdatePending]);
}
