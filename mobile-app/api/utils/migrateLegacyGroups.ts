import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAxiosError } from 'axios';

import { Client as BeerPongClient } from '@/openapi/openapi';
import { ScopedLogger } from '@/utils/logging';

// Before accounts, the app remembered joined groups only on the device (zustand persist key).
const LEGACY_GROUP_STORAGE_KEY = 'group-storage';

const logger = new ScopedLogger('legacy-groups');

let migration: Promise<void> | null = null;

const readLegacyGroupIds = async () => {
    const raw = await AsyncStorage.getItem(LEGACY_GROUP_STORAGE_KEY);
    if (!raw) return [];
    try {
        const ids: unknown = JSON.parse(raw)?.state?.groupIds;
        return Array.isArray(ids)
            ? ids.filter((id): id is string => typeof id === 'string')
            : [];
    } catch {
        return [];
    }
};

/**
 * Joins the groups an install had joined before accounts existed, so existing users
 * keep their groups after updating. Runs once per launch until it succeeds.
 */
export function migrateLegacyGroups(api: BeerPongClient) {
    migration ??= (async () => {
        const legacyIds = await readLegacyGroupIds();
        if (legacyIds.length === 0) return;

        const res = await api.findUserGroups();
        const joined = new Set(res.data.data?.map((g) => g.id));

        for (const id of legacyIds.filter((id) => !joined.has(id))) {
            try {
                await api.joinGroup({ id }, {});
            } catch (err) {
                // Deleted groups answer with a 4xx; anything else is retried next launch.
                if (!isAxiosError(err) || !err.response) throw err;
                logger.warn('could not join legacy group', id, err.message);
            }
        }
        await AsyncStorage.removeItem(LEGACY_GROUP_STORAGE_KEY);
        logger.info('migrated legacy groups', legacyIds.length);
    })().catch((err) => {
        migration = null;
        logger.error('legacy group migration failed', err);
    });

    return migration;
}
