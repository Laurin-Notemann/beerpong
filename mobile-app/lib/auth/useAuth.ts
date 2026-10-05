import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import { isAxiosError } from 'axios';
// import * as Notifications from 'expo-notifications';
// import * as Permissions from 'expo-permissions';
import { Platform } from 'react-native';

import { decodeJwt, JwtPayload } from '@/lib/auth/decodeJwt';
import { versusDeviceStorage } from '@/lib/deviceStorage';
import { Client as BeerPongClient } from '@/openapi/openapi';
import { ConsoleLogger } from '@/utils/logging';

const REGENERATE_ACCESS_TOKEN_WHEN_ITS_ABOUT_TO_EXPIRE_IN_SECONDS = 60;

/**
 * should be unique for every device, even across reinstalls
 */
export async function getInstallationId() {
    // important: the platform-specific Application methods throw an error if they're called on the wrong platform!
    const installationId =
        Platform.OS === 'ios'
            ? await Application.getIosIdForVendorAsync()
            : Application.getAndroidId();

    if (installationId == null) {
        throw new Error('failed to get installation id');
    }
    return installationId;
}

// async function registerForPushNotifications() {
//     const { status: existingStatus } = await Permissions.getAsync(
//         Permissions.NOTIFICATIONS
//     );
//     let finalStatus = existingStatus;

//     if (existingStatus !== 'granted') {
//         const { status } = await Permissions.askAsync(
//             Permissions.NOTIFICATIONS
//         );
//         finalStatus = status;
//     }
//     if (finalStatus !== 'granted') return null;

//     const tokenData = await Notifications.getExpoPushTokenAsync();

//     const pushNotificationToken = tokenData.data; // e.g. “ExponentPushToken[xxxxxxxxxxxxxx]”
// }

// export function usePushNotifications() {
//     const registerForPushNotificationsMutation =
//         useRegisterForPushNotificationsMutation();

//     return {
//         registerForPushNotifications: async function () {
//             const expoToken = await registerForPushNotifications();
//             if (expoToken) {
//                 await registerForPushNotificationsMutation.mutateAsync(
//                     expoToken
//                 );
//             }
//         },
//     };
// }

async function getRefreshToken(api: BeerPongClient): Promise<string> {
    try {
        const existingRefreshToken =
            await versusDeviceStorage.getRefreshToken();

        if (existingRefreshToken) return existingRefreshToken;

        const installationType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

        const deviceId = await getInstallationId();

        const signupRes = await api.signup(undefined, {
            installationType,
            deviceId,
        });

        const refreshToken = signupRes.data.data?.token;

        if (!refreshToken) {
            throw new Error('response.data.data.token is null');
        }
        await versusDeviceStorage.setRefreshToken(refreshToken);

        return refreshToken;
    } catch (err) {
        ConsoleLogger.error('Failed to get refresh token:', err);

        (err as Error).message =
            'Failed to get refresh token: ' +
            (err instanceof Error ? err.message : 'Unknown error');

        throw err;
    }
}

class RefreshTokenRejectedError extends Error {
    constructor() {
        super(
            'Failed to get access token: refresh token not accepted by backend'
        );
    }
}

const isRefreshTokenRejected = (err: unknown) =>
    err instanceof RefreshTokenRejectedError;

interface GetAccessTokenResult {
    accessToken: string;
    accessTokenPayload: JwtPayload;
}

async function getAccessToken(
    api: BeerPongClient
): Promise<GetAccessTokenResult> {
    let refreshToken: string | null = null;
    try {
        refreshToken = await getRefreshToken(api);

        const accessTokenRes = await api.refreshAuth(undefined, {
            refreshToken,
        });

        const accessToken = accessTokenRes.data.data?.token;

        if (!accessToken) {
            throw new Error('response.data.data.token is null');
        }
        try {
            const accessTokenPayload = decodeJwt(accessToken);

            return { accessToken, accessTokenPayload };
        } catch (err) {
            throw new Error(
                'Failed to decode: ' +
                    (err instanceof Error ? err.message : 'Unknown error')
            );
        }
    } catch (err) {
        ConsoleLogger.error('Failed to get access token:', err);
        if (isAxiosError(err)) {
            // more detailed error response returned by the backend, can be found in api-go/internal/api/errors.go
            const customErrorCode = err.response?.data.error?.code;

            // standard http error code, e.g. "Bad Request"
            const httpErrorCode = err.response?.data.error;

            const isInvalidRefreshToken =
                customErrorCode === 'authRefreshInvalidToken';

            if (isInvalidRefreshToken) {
                ConsoleLogger.warn(
                    'Refresh token not accepted by backend, signing up again'
                );
                await versusDeviceStorage.removeRefreshToken();

                err = new RefreshTokenRejectedError();
            } else {
                const message = customErrorCode ?? httpErrorCode ?? err.message;

                (err as Error).message =
                    'Failed to get access token: ' +
                    message +
                    ': ' +
                    err.message;
            }
        } else {
            (err as Error).message =
                'Failed to get access token: ' +
                ((err as Error).message ?? 'Unknown error');
        }

        // A rejected refresh token is recovered from by signing up again.
        if (!isRefreshTokenRejected(err)) Sentry.captureException(err);
        throw err;
    }
}

// One token cache for every request in the app; access tokens expire after an hour.
let cachedAccessToken: GetAccessTokenResult | null = null;
let pendingAccessToken: Promise<GetAccessTokenResult> | null = null;

const isFresh = (token: GetAccessTokenResult) =>
    (token.accessTokenPayload.exp ?? 0) * 1000 - Date.now() >
    REGENERATE_ACCESS_TOKEN_WHEN_ITS_ABOUT_TO_EXPIRE_IN_SECONDS * 1000;

/** Returns a valid access token, refreshing (or signing up again) when needed. */
export async function getValidAccessToken(
    api: BeerPongClient
): Promise<GetAccessTokenResult> {
    if (cachedAccessToken && isFresh(cachedAccessToken)) {
        return cachedAccessToken;
    }
    if (!pendingAccessToken) {
        ConsoleLogger.info('refreshing access token');

        pendingAccessToken = getAccessToken(api)
            .catch((err) => {
                if (!isRefreshTokenRejected(err)) throw err;
                // The stored refresh token belongs to a user the backend doesn't know
                // (e.g. a Keychain entry from an older build). It was removed, so this
                // signs the device up again.
                return getAccessToken(api);
            })
            .then((token) => {
                cachedAccessToken = token;
                return token;
            })
            .finally(() => {
                pendingAccessToken = null;
            });
    }
    return pendingAccessToken;
}

/** Current session as seen by the token cache, for the debug menu. */
export const getSessionDebugInfo = () => ({
    userId: cachedAccessToken?.accessTokenPayload.sub ?? null,
    accessTokenExpiresAt: cachedAccessToken?.accessTokenPayload.exp
        ? new Date(cachedAccessToken.accessTokenPayload.exp * 1000)
        : null,
});

export function useAuth() {
    return { getAccessToken: getValidAccessToken };
}
