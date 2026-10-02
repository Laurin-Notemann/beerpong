import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/** What is running on this device: the native build plus the OTA update on top of it. */
export const releaseInfo = {
    version: Application.nativeApplicationVersion,
    buildNumber: Application.nativeBuildVersion,
    bundleId: Application.applicationId,
    // Inlined when the JS bundle is built (EAS build or update); unset in local dev.
    gitCommit: process.env.EXPO_PUBLIC_GIT_COMMIT || null,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    updateCreatedAt: Updates.createdAt?.toISOString() ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    os: `${Platform.OS} ${Platform.Version}`,
};
