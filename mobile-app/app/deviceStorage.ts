import * as SecureStore from 'expo-secure-store';

import { ScopedLogger } from '@/utils/logging';

class VersusDeviceStorage {
    private store = SecureStore;

    private logger = new ScopedLogger('versus-device-storage');

    private KEYCHAIN_SERVICE = 'Versus';

    private REFRESH_TOKEN_KEY = 'refresh-token';

    private async getItemAsync(key: string) {
        try {
            return this.store.getItemAsync(key, {
                keychainAccessible: 0,
                keychainService: this.KEYCHAIN_SERVICE,
            });
        } catch (err) {
            this.logger.error(`Failed to get item with key "${key}":`, err);
        }
    }
    private async setItemAsync(key: string, value: string) {
        try {
            return this.store.setItemAsync(key, value, {
                keychainAccessible: 0,
                keychainService: this.KEYCHAIN_SERVICE,
            });
        } catch (err) {
            this.logger.error(
                `Failed to set item with key "${key}": to value "${value}"`,
                err
            );
        }
    }
    private async removeItemAsync(key: string) {
        try {
            return this.store.deleteItemAsync(key, {
                keychainAccessible: 0,
                keychainService: this.KEYCHAIN_SERVICE,
            });
        } catch (err) {
            this.logger.error(`Failed to remove item with key "${key}":`, err);
        }
    }

    public async getRefreshToken() {
        return this.getItemAsync(this.REFRESH_TOKEN_KEY);
    }
    public async setRefreshToken(token: string) {
        return this.setItemAsync(this.REFRESH_TOKEN_KEY, token);
    }
    public async removeRefreshToken() {
        return this.removeItemAsync(this.REFRESH_TOKEN_KEY);
    }
}
export const versusDeviceStorage = new VersusDeviceStorage();
