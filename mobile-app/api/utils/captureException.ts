import * as Sentry from '@sentry/react-native';

export const captureMutationErr = (mutationName: string) => (err: unknown) => {
    if (err instanceof Error) {
        err.message = `mutation.${mutationName}: ${err.message}`;
    }

    Sentry.withScope((scope) => {
        scope.setTag('mutation', mutationName);
        scope.setFingerprint(['mutation', '{{ default }}']); // we're already recording the http error in create-api, this is to keep sentry from hiding this one in the dashboard
        Sentry.captureException(err);
    });
};
