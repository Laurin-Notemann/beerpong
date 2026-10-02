import { useNavigationState } from '@react-navigation/native';
import React, { useState } from 'react';
import { Share } from 'react-native';

import { env } from '@/api/env';
import { getInstallationId } from '@/app/auth/useAuth';
import {
    RootStackParamList,
    useNavigation,
} from '@/app/navigation/useNavigation';
import { DebugRow, DebugScreen } from '@/components/debug/DebugScreen';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { showErrorToast, showSuccessToast } from '@/toast';
import { releaseInfo } from '@/utils/releaseInfo';
import { Sentry } from '@/utils/sentry';

const SECTIONS: {
    route: Extract<keyof RootStackParamList, `debug${string}`>;
    title: string;
    subtitle: string;
}[] = [
    {
        route: 'debugUpdates',
        title: 'EAS Updates',
        subtitle: 'expo-updates state and manual controls',
    },
    {
        route: 'debugSession',
        title: 'Session',
        subtitle: 'Account, tokens and installation id',
    },
    {
        route: 'debugQueries',
        title: 'Query Cache',
        subtitle: 'Live TanStack Query cache entries',
    },
    {
        route: 'debugStorage',
        title: 'Storage',
        subtitle: 'Inspect and delete local AsyncStorage data',
    },
    {
        route: 'debugLog',
        title: 'Logs & Realtime',
        subtitle: 'In-app logs and websocket connection',
    },
];

const snapshot = async () => ({
    build: releaseInfo,
    env: {
        apiBaseUrl: env.apiBaseUrl,
        realtimeBaseUrl: env.realtimeBaseUrl,
    },
    installationId: await getInstallationId().catch(() => null),
});

export default function Page() {
    const nav = useNavigation();
    const routes = useNavigationState((state) =>
        state?.routes.map((r) => r.name)
    );
    const [isSending, setIsSending] = useState(false);

    const shareDeviceInfo = async () => {
        await Share.share({
            message: JSON.stringify(await snapshot(), null, 2),
            title: 'Versus device info',
        }).catch(() => undefined);
    };

    const sendDiagnostic = async () => {
        setIsSending(true);
        try {
            const eventId = Sentry.captureMessage('Diagnostic snapshot', {
                level: 'info',
                contexts: { diagnostic: await snapshot() },
            });
            await Sentry.flush();
            showSuccessToast(`Diagnostic sent. Sentry ID: ${eventId}`);
        } catch {
            showErrorToast('Diagnostic report could not be sent.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <DebugScreen title="Debug">
            <MenuSection title="Tools">
                {SECTIONS.map((s, idx) => (
                    <MenuItem
                        key={s.route}
                        border={idx > 0}
                        title={s.title}
                        subtitle={s.subtitle}
                        tailIconType="next"
                        onPress={() => nav.navigate(s.route)}
                    />
                ))}
            </MenuSection>
            <MenuSection title="Build">
                <DebugRow first label="Version" value={releaseInfo.version} />
                <DebugRow
                    label="Build number"
                    value={releaseInfo.buildNumber}
                />
                <DebugRow label="Git commit" value={releaseInfo.gitCommit} />
                <DebugRow label="Update channel" value={releaseInfo.channel} />
                <DebugRow label="Update ID" value={releaseInfo.updateId} />
                <DebugRow
                    label="Update created"
                    value={releaseInfo.updateCreatedAt}
                />
                <DebugRow
                    label="Embedded launch"
                    value={releaseInfo.isEmbeddedLaunch}
                />
                <DebugRow
                    label="Runtime version"
                    value={releaseInfo.runtimeVersion}
                />
                <DebugRow label="Bundle ID" value={releaseInfo.bundleId} />
                <DebugRow label="Backend" value={env.apiBaseUrl} />
                <DebugRow label="Realtime" value={env.realtimeBaseUrl} />
                <DebugRow label="OS" value={releaseInfo.os} />
            </MenuSection>
            <MenuSection title="Navigation">
                <DebugRow first label="Stack" value={routes?.join(' → ')} />
            </MenuSection>
            <MenuSection title="Support">
                <MenuItem
                    border={false}
                    title="Share device info"
                    headIcon="share-variant"
                    onPress={shareDeviceInfo}
                />
                <MenuItem
                    title={
                        isSending
                            ? 'Sending…'
                            : 'Send diagnostic report to Sentry'
                    }
                    headIcon="bug-outline"
                    onPress={isSending ? undefined : sendDiagnostic}
                />
            </MenuSection>
        </DebugScreen>
    );
}
