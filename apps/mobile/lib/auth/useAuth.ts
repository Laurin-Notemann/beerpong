import { isAxiosError } from 'axios';
import * as Application from 'expo-application';
// import * as Notifications from 'expo-notifications';
// import * as Permissions from 'expo-permissions';
import { Platform } from 'react-native';

import { decodeJwt, JwtPayload } from '@/lib/auth/decodeJwt';
import { createTokenCache, tokenExpiresAt } from '@/lib/auth/tokenCache';
import { versusDeviceStorage } from '@/lib/deviceStorage';
import { Client as BeerPongClient, Components } from '@/openapi/openapi';
import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('auth');

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
        logger.error('Failed to get refresh token:', err);

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
    expiresAt: number;
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

        const receivedAt = Date.now();
        const accessToken = accessTokenRes.data.data?.token;

        if (!accessToken) {
            throw new Error('response.data.data.token is null');
        }
        try {
            const accessTokenPayload = decodeJwt(accessToken);

            return {
                accessToken,
                accessTokenPayload,
                expiresAt: tokenExpiresAt(accessTokenPayload, receivedAt),
            };
        } catch (err) {
            throw new Error(
                'Failed to decode: ' +
                    (err instanceof Error ? err.message : 'Unknown error')
            );
        }
    } catch (err) {
        logger.error('Failed to get access token:', err);
        if (isAxiosError<{ error?: Components.Schemas.ErrorDetails }>(err)) {
            // more detailed error response returned by the backend, can be found in apps/api/internal/api/errors.go
            const customErrorCode = err.response?.data.error?.code;

            // standard HTTP status, when the backend sent no custom code
            const httpErrorCode = err.response?.status;

            const isInvalidRefreshToken =
                customErrorCode === 'authRefreshInvalidToken';

            if (isInvalidRefreshToken) {
                logger.warn(
                    'Refresh token not accepted by backend, signing up again'
                );
                await versusDeviceStorage.removeRefreshToken();

                throw new RefreshTokenRejectedError();
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

        // Not reported here: the request this token was for fails with this error, and the
        // API client's interceptor reports it (see create-api.tsx).
        throw err;
    }
}

// One token cache for every request in the app; access tokens expire after an hour.
const tokenCache = createTokenCache<GetAccessTokenResult>();

/** Returns a valid access token, refreshing (or signing up again) when needed. */
export function getValidAccessToken(
    api: BeerPongClient
): Promise<GetAccessTokenResult> {
    return tokenCache.get(() => {
        logger.info('refreshing access token');

        return getAccessToken(api).catch((err) => {
            if (!isRefreshTokenRejected(err)) throw err;
            // The stored refresh token belongs to a user the backend doesn't know
            // (e.g. a Keychain entry from an older build). It was removed, so this
            // signs the device up again.
            return getAccessToken(api);
        });
    });
}

/** Current session as seen by the token cache, for the debug menu. */
export const getSessionDebugInfo = () => {
    const token = tokenCache.peek();
    return {
        userId: token?.accessTokenPayload.sub ?? null,
        accessTokenExpiresAt: token ? new Date(token.expiresAt) : null,
    };
};

export function useAuth() {
    return {
        getAccessToken: getValidAccessToken,
        /** after the API rejected `accessToken` with a 401 */
        invalidateAccessToken: (accessToken: string) =>
            tokenCache.invalidate(accessToken),
    };
}
