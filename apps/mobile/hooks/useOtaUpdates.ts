import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { useEffect, useEffectEvent } from 'react';
import { AppState } from 'react-native';

import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('ota');

/**
 * The phone couldn't reach the update server: offline, a timeout, a dropped connection, or a
 * download that iOS cut off after the app went to the background ("Failed to load all
 * assets", MOBILE-T). The next foreground tries again, so these aren't bugs.
 */
const NETWORK_ERROR =
    /timed out|connection was lost|offline|not connected to the internet|could not connect|network|unable to resolve host|failed to connect|timeout|failed to load all assets/i;

export const isNetworkError = (error: unknown) =>
    NETWORK_ERROR.test(error instanceof Error ? error.message : String(error));

/**
 * Silent OTA updates: checks and downloads when the app comes to the foreground,
 * and only applies a downloaded update once the app is backgrounded, so the user
 * never sees a reload mid-session.
 */
export function useOtaUpdates() {
    const { isUpdatePending, isChecking, isDownloading, downloadedUpdate } =
        Updates.useUpdates();

    // AppState listeners are registered once; effect events read the latest flags.
    const applyPending = useEffectEvent(() => {
        if (!isUpdatePending || AppState.currentState !== 'background') return;
        logger.info(
            `applying update ${downloadedUpdate?.updateId ?? 'rollback'} (running ${Updates.updateId ?? 'embedded'})`
        );
        Updates.reloadAsync().catch((error: unknown) => {
            Sentry.captureException(error, { tags: { ota: 'reload' } });
        });
    });

    // Also checks while an update is pending: if its reload never happened, a newer one
    // replaces it instead of the phone staying on it until a cold start.
    const checkForUpdate = useEffectEvent(async () => {
        if (isChecking || isDownloading) return;
        try {
            const result = await Updates.checkForUpdateAsync();
            if (result.isAvailable || result.isRollBackToEmbedded) {
                const fetched = await Updates.fetchUpdateAsync();
                logger.info(
                    `downloaded update ${fetched.manifest?.id ?? 'rollback'}`
                );
            }
        } catch (error) {
            if (isNetworkError(error)) {
                logger.info('update check failed, retrying next time:', error);
                return;
            }
            Sentry.captureException(error, { tags: { ota: 'check' } });
        }
    });

    useEffect(() => {
        if (__DEV__ || !Updates.isEnabled) return;

        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') checkForUpdate();
            if (next === 'background') applyPending();
        });
        return () => subscription.remove();
    }, []);

    // A download can finish after the app was already backgrounded.
    useEffect(() => {
        if (!__DEV__) applyPending();
    }, [isUpdatePending, downloadedUpdate?.updateId]);
}
