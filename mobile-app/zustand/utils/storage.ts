import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware'

export const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            return await AsyncStorage.getItem(name);
        } catch (err) {
            throw new Error('Error loading from storage' + err);
        }
    },
    setItem: async (name: string, value: string): Promise<void> => {
        try {
            await AsyncStorage.setItem(name, value);
        } catch (err) {
            throw new Error('Error saving to storage' + err);
        }
    },
    removeItem: async (name: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(name);
        } catch (err) {
            throw new Error('Error removing from storage' + err);
        }
    },
};
