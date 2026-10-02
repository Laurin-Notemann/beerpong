import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

import { env } from '@/api/env';
import { releaseInfo } from '@/utils/releaseInfo';

const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds are bound to an EAS channel (preview / production); local dev has none.
const environment = Updates.channel || (__DEV__ ? 'development' : 'unknown');

// https://sentry.io is the error reporting SaaS we use to remotely track production issues.
// The native SDK is already started before JS loads (`useNativeInit` in app.json),
// so crashes during app start are captured too; this adds the JS layer on top.
Sentry.init({
    dsn: env.sentry.dsn,
    enabled: env.sentry.enabled,
    environment,
    // Traces: sample everything while the user base is small.
    tracesSampleRate: 1.0,
    // Continue traces into our backend so app and server spans line up.
    tracePropagationTargets: env.apiBaseUrl
        ? [new RegExp(`^${escapeRegExp(env.apiBaseUrl)}`)]
        : [],
    // Logs: forwards console.* (and Sentry.logger.*) to Sentry Logs.
    enableLogs: true,
    sendDefaultPii: true,
    attachScreenshot: true,
    enableAppHangTracking: true,
    integrations: [Sentry.expoRouterIntegration()],
});

Sentry.setTag('update_id', Updates.updateId ?? 'embedded');
Sentry.setTag('runtime_version', Updates.runtimeVersion ?? 'unknown');
Sentry.setTag('git_commit', releaseInfo.gitCommit ?? 'unknown');

export { Sentry };
