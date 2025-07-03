import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import jwt, { JWTBody, JWTDefaultBody } from 'expo-jwt';
import { useState } from 'react';
import { Platform } from 'react-native';

import { versusDeviceStorage } from '@/app/deviceStorage';
import { Client as BeerPongClient } from '@/openapi/openapi';
import { ConsoleLogger } from '@/utils/logging';

const REGENERATE_ACCESS_TOKEN_WHEN_ITS_ABOUT_TO_EXPIRE_IN_SECONDS = 10;

/**
 * should be unique for every device, even across reinstalls
 */
async function getInstallationId() {
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

        const signupRes = await api.signup({}, { installationType, deviceId });

        const refreshToken = signupRes.data.data?.token;

        if (!refreshToken) {
            throw new Error('response.data.data.token is null');
        }
        await versusDeviceStorage.setRefreshToken(refreshToken);

        return refreshToken;
    } catch (err) {
        ConsoleLogger.error('Failed to get refresh token:', err);
        throw new Error(
            'Failed to get refresh token: ' +
                (err instanceof Error ? err.message : 'Unknown error')
        );
    }
}

interface GetAccessTokenResult {
    accessToken: string;
    accessTokenPayload: JWTBody<JWTDefaultBody>;
}

async function getAccessToken(
    api: BeerPongClient
): Promise<GetAccessTokenResult> {
    try {
        const refreshToken = await getRefreshToken(api);

        const accessTokenRes = await api.refreshAuth({}, { refreshToken });

        const accessToken = accessTokenRes.data.data?.token;

        if (!accessToken) {
            throw new Error('response.data.data.token is null');
        }
        try {
            const accessTokenPayload = jwt.decode(accessToken, null);

            return { accessToken, accessTokenPayload };
        } catch (err) {
            throw new Error(
                'Failed to decode: ' +
                    (err instanceof Error ? err.message : 'Unknown error')
            );
        }
    } catch (err) {
        ConsoleLogger.error('Failed to get access token:', err);
        throw new Error(
            'Failed to get access token: ' +
                (err instanceof Error ? err.message : 'Unknown error')
        );
    }
}

export function useAuth() {
    const [fetchingPromise, setFetchingPromise] =
        useState<Promise<GetAccessTokenResult> | null>(null);
    const [accessToken, setAccessToken] = useState<GetAccessTokenResult | null>(
        null
    );

    return {
        getAccessToken: async (api: BeerPongClient) => {
            const isAboutToExpire =
                (accessToken?.accessTokenPayload.exp ?? 0) <
                Date.now() -
                    REGENERATE_ACCESS_TOKEN_WHEN_ITS_ABOUT_TO_EXPIRE_IN_SECONDS *
                        1000;

            if (accessToken && !isAboutToExpire) {
                return accessToken;
            }
            if (fetchingPromise) return await fetchingPromise;

            try {
                ConsoleLogger.info('refreshing access token');
                const promise = getAccessToken(api);

                setFetchingPromise(promise);

                const value = await promise;

                ConsoleLogger.info('refreshed access token');

                setAccessToken(value);

                return value;
            } catch (err) {
                ConsoleLogger.error(
                    'Failed to resolve access token promise:',
                    err
                );
                setFetchingPromise(null);
                throw new Error('Failed to get access token: ' + err);
            }
        },
    };
}
