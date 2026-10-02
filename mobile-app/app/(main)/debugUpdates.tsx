import * as Updates from 'expo-updates';
import React from 'react';

import { DebugRow, DebugScreen } from '@/components/debug/DebugScreen';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { showErrorToast, showSuccessToast } from '@/toast';
import { releaseInfo } from '@/utils/releaseInfo';

const run = async (action: () => Promise<unknown>, success: string) => {
    try {
        await action();
        showSuccessToast(success);
    } catch (err) {
        showErrorToast(err instanceof Error ? err.message : String(err));
    }
};

export default function Page() {
    const updates = Updates.useUpdates();
    const { currentlyRunning, availableUpdate, downloadedUpdate } = updates;

    return (
        <DebugScreen title="EAS Updates">
            <MenuSection title="Running">
                <DebugRow first label="Enabled" value={Updates.isEnabled} />
                <DebugRow label="Channel" value={currentlyRunning.channel} />
                <DebugRow label="Git commit" value={releaseInfo.gitCommit} />
                <DebugRow label="Update ID" value={currentlyRunning.updateId} />
                <DebugRow
                    label="Created"
                    value={currentlyRunning.createdAt?.toISOString()}
                />
                <DebugRow
                    label="Embedded launch"
                    value={currentlyRunning.isEmbeddedLaunch}
                />
                <DebugRow
                    label="Emergency launch"
                    value={currentlyRunning.isEmergencyLaunch}
                />
                <DebugRow
                    label="Runtime version"
                    value={currentlyRunning.runtimeVersion}
                />
            </MenuSection>
            <MenuSection title="State">
                <DebugRow first label="Checking" value={updates.isChecking} />
                <DebugRow label="Downloading" value={updates.isDownloading} />
                <DebugRow
                    label="Update pending (applies on background)"
                    value={updates.isUpdatePending}
                />
                <DebugRow
                    label="Last check"
                    value={updates.lastCheckForUpdateTimeSinceRestart?.toISOString()}
                />
                <DebugRow
                    label="Available update"
                    value={availableUpdate?.updateId}
                />
                <DebugRow
                    label="Downloaded update"
                    value={downloadedUpdate?.updateId}
                />
                <DebugRow
                    label="Check error"
                    value={updates.checkError?.message}
                />
                <DebugRow
                    label="Download error"
                    value={updates.downloadError?.message}
                />
            </MenuSection>
            <MenuSection title="Actions">
                <MenuItem
                    border={false}
                    title="Check for update"
                    headIcon="cloud-search-outline"
                    onPress={() =>
                        run(Updates.checkForUpdateAsync, 'Check finished')
                    }
                />
                <MenuItem
                    title="Download update"
                    headIcon="cloud-download-outline"
                    onPress={() =>
                        run(Updates.fetchUpdateAsync, 'Download finished')
                    }
                />
                <MenuItem
                    title="Apply now (reload app)"
                    headIcon="restart"
                    onPress={() => run(Updates.reloadAsync, 'Reloading')}
                />
            </MenuSection>
        </DebugScreen>
    );
}
