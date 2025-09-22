import * as Sentry from '@sentry/react-native';

export const captureMutationErr = (mutationName: string) => (err: unknown) => {
    Sentry.captureException(err, {
        tags: {
            mutation: mutationName,
        },
    });
};
