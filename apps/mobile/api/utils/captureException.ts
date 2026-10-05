import * as Sentry from '@sentry/react-native';
import { isAxiosError } from 'axios';

/**
 * `onError` for mutations. A failed API request was already reported, or deliberately not
 * (offline, expected 4xx), by the API client (`installApiInterceptors`); this reports the
 * rest, e.g. an image that failed to compress or upload.
 */
export const captureMutationErr = (mutationName: string) => (err: unknown) => {
    if (isAxiosError(err)) {
        Sentry.addBreadcrumb({
            category: 'mutation',
            message: `${mutationName} failed`,
            level: 'warning',
        });
        return;
    }
    if (err instanceof Error) {
        err.message = `mutation.${mutationName}: ${err.message}`;
    }

    Sentry.withScope((scope) => {
        scope.setTag('mutation', mutationName);
        Sentry.captureException(err);
    });
};
