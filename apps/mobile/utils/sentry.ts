import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

import { env } from '@/api/env';
import { keepErrorCausesInLogs } from '@/utils/logging';
import { releaseInfo } from '@/utils/releaseInfo';

const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds are bound to an EAS channel (preview / production); local dev has none.
const environment = Updates.channel || (__DEV__ ? 'development' : 'unknown');

// One release per JS bundle, named like the API's (`api-go@<sha>`), so "resolved in the next
// release" works for fixes that ship as an OTA update. The default, the native build
// (`com.linusbolls.mobileapp@1.0.93+104`), stays the same across updates. Source maps are
// matched by debug id, not by release. Native crashes keep the native build's release.
const release = releaseInfo.gitCommit
    ? `mobile@${releaseInfo.gitCommit}`
    : undefined;

// https://sentry.io is the error reporting SaaS we use to remotely track production issues.
// The native SDK is already started before JS loads (`useNativeInit` in app.json),
// so crashes during app start are captured too; this adds the JS layer on top.
Sentry.init({
    dsn: env.sentry.dsn,
    enabled: env.sentry.enabled,
    environment,
    release,
    // Traces: sample everything while the user base is small.
    tracesSampleRate: 1.0,
    // Continue traces into our backend so app and server spans line up.
    tracePropagationTargets: env.apiBaseUrl
        ? [new RegExp(`^${escapeRegExp(env.apiBaseUrl)}`)]
        : [],
    // Logs: forwards console.* (and Sentry.logger.*) to Sentry Logs.
    enableLogs: true,
    sendDefaultPii: true,
    // The native screenshot grab ran off the main thread inside the crash handler and crashed
    // a second time (ExpoAppSceneDelegate.window asserts the main queue).
    attachScreenshot: false,
    enableAppHangTracking: true,
    // No expoRouterIntegration: it reads Expo Router internals SDK 58 removed and does nothing
    // (useSentryScreenTransactions names the screens instead). App start is its own
    // transaction; attached to the first transaction, it went to whichever started first,
    // often "expo-updates check" or "expo-updates download".
    _experiments: { enableStandaloneAppStartTracing: true },
});

keepErrorCausesInLogs();

Sentry.setTag('update_id', Updates.updateId ?? 'embedded');
Sentry.setTag('runtime_version', Updates.runtimeVersion ?? 'unknown');
Sentry.setTag('git_commit', releaseInfo.gitCommit ?? 'unknown');

export { Sentry };
